import { fetchStrapi, fetchStrapiCollection } from "@/lib/strapi";
import { parseRole, type UserRole } from "@/lib/roles";

const TOKEN_KEY = "joomla_token";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  role?: {
    id: number;
    name: string;
  };
};

export type AuthState = {
  token: string;
  user: AuthUser;
  appRole: UserRole | null;
  profile: {
    id?: number;
    documentId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  } | null;
};

type CustomUser = {
  id?: number;
  documentId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
};

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
}

export async function resolveProfile(token: string, email: string): Promise<CustomUser | null> {
  const users = await fetchStrapiCollection<CustomUser>(`/users`, {
    token,
    query: {
      "filters[email][$eq]": email,
      "pagination[limit]": 1,
    },
  });

  return users.length > 0 ? users[0] : null;
}

export async function login(email: string, password: string): Promise<AuthState> {
  // com_ambassador login endpoint
  const payload = (await fetchStrapi("/srh-api/index.php/auth/login", {
    method: "POST",
    body: JSON.stringify({
      identifier: email,
      password,
    }),
    skipApiPrefix: true,
  })) as unknown as { data: { jwt: string; user: AuthUser & { firstName?: string; lastName?: string; role?: string } } };

  const loginData = payload.data ?? (payload as unknown as { jwt: string; user: AuthUser });
  const jwt = (loginData as { jwt?: string }).jwt ?? (payload as unknown as { jwt: string }).jwt;
  const user = (loginData as { user?: AuthUser }).user ?? (payload as unknown as { user: AuthUser }).user;

  if (!jwt || !user) {
    throw new Error("Invalid login response");
  }

  // Build appRole from the role field returned directly in the login response
  const roleString = (user as { role?: string }).role ?? null;
  const appRole = parseRole(roleString);

  // Build a minimal profile from the login response (avoids a second round-trip)
  const profile: CustomUser = {
    id: user.id,
    documentId: String(user.id),
    firstName: (user as { firstName?: string }).firstName,
    lastName: (user as { lastName?: string }).lastName,
    email: user.email,
    role: roleString ?? undefined,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, jwt);
  }

  return {
    token: jwt,
    user,
    appRole,
    profile,
  };
}

// User registration is not available — accounts are pre-created by administrators.
export async function signup(_input: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthState> {
  throw new Error(
    "User registration is not available. Please sign in with your pre-assigned university credentials."
  );
}

export async function fetchMe(token: string): Promise<AuthState | null> {
  // com_ambassador /users/me endpoint (replaces Strapi /users/me)
  const payload = (await fetchStrapi("/srh-api/index.php/users/me", {
    token,
    skipApiPrefix: true,
  })) as unknown as { data: AuthUser & { role?: string; firstName?: string; lastName?: string } };

  const userData = (payload as unknown as { data?: AuthUser }).data ?? (payload as unknown as AuthUser);

  if (!userData || !(userData as { email?: string }).email) {
    return null;
  }

  const me = userData as AuthUser & { role?: string; firstName?: string; lastName?: string };
  const appRole = parseRole(me.role ?? null);

  const profile: CustomUser = {
    id: me.id,
    documentId: String(me.id),
    firstName: me.firstName,
    lastName: me.lastName,
    email: me.email,
    role: me.role,
  };

  return {
    token,
    user: me,
    appRole,
    profile,
  };
}
