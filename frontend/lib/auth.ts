import { fetchStrapi, fetchStrapiCollection } from "@/lib/strapi";
import { parseRole, type UserRole } from "@/lib/roles";

const TOKEN_KEY = "strapi_token";

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

type LoginResponse = {
  jwt: string;
  user: AuthUser;
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
  const payload = (await fetchStrapi("/auth/local", {
    method: "POST",
    body: JSON.stringify({
      identifier: email,
      password,
    }),
  })) as unknown as LoginResponse;

  if (!payload.jwt || !payload.user) {
    throw new Error("Invalid login response");
  }

  const profile = await resolveProfile(payload.jwt, payload.user.email);
  const appRole = parseRole(profile?.role ?? null);
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, payload.jwt);
  }

  return {
    token: payload.jwt,
    user: payload.user,
    appRole,
    profile,
  };
}

export async function signup(input: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthState> {
  const payload = (await fetchStrapi("/auth/local/register", {
    method: "POST",
    body: JSON.stringify(input),
  })) as unknown as LoginResponse;

  if (!payload.jwt || !payload.user) {
    throw new Error("Invalid signup response");
  }

  const profile = await resolveProfile(payload.jwt, payload.user.email);
  const appRole = parseRole(profile?.role ?? null);
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, payload.jwt);
  }

  return {
    token: payload.jwt,
    user: payload.user,
    appRole,
    profile,
  };
}

export async function fetchMe(token: string): Promise<AuthState | null> {
  const payload = (await fetchStrapi("/users/me?populate=role", {
    token,
    skipApiPrefix: true,
  })) as unknown as AuthUser;

  if (!payload || !payload.email) {
    return null;
  }

  const profile = await resolveProfile(token, payload.email);
  const appRole = parseRole(profile?.role ?? null);
  return {
    token,
    user: payload,
    appRole,
    profile,
  };
}
