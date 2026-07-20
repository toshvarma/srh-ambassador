export type UserRole =
  | "Student"
  | "ExchangeStudent"
  | "Professor"
  | "Teacher"
  | "Ambassador"
  | "Admin"
  | "SuperAdmin";

export const roleLabels: Record<UserRole, { en: string; de: string }> = {
  Student: { en: "Student", de: "Student" },
  ExchangeStudent: { en: "Exchange Student", de: "Austauschstudent" },
  Professor: { en: "Professor", de: "Professor" },
  Teacher: { en: "Teacher", de: "Lehrer" },
  Ambassador: { en: "Ambassador", de: "Botschafter" },
  Admin: { en: "Admin", de: "Admin" },
  SuperAdmin: { en: "Super Admin", de: "Super Admin" },
};

export type RoleCapabilities = {
  canSubmitClubIdea: boolean;
  canApproveClubIdea: boolean;
  canManageNews: boolean;
  canManageEvents: boolean;
  canManageClubs: boolean;
  canViewUsers: boolean;
};

const defaultCapabilities: RoleCapabilities = {
  canSubmitClubIdea: false,
  canApproveClubIdea: false,
  canManageNews: false,
  canManageEvents: false,
  canManageClubs: false,
  canViewUsers: true,
};

export function parseRole(role: string | null | undefined): UserRole | null {
  if (!role) {
    return null;
  }

  const normalized = role.replace(/\s+/g, "");
  const knownRoles: UserRole[] = [
    "Student",
    "ExchangeStudent",
    "Professor",
    "Teacher",
    "Ambassador",
    "Admin",
    "SuperAdmin",
  ];
  return knownRoles.includes(normalized as UserRole) ? (normalized as UserRole) : null;
}

export function getCapabilities(role: UserRole | null): RoleCapabilities {
  if (!role) {
    return defaultCapabilities;
  }

  switch (role) {
    case "Student":
      return {
        ...defaultCapabilities,
        canSubmitClubIdea: true,
      };
    case "ExchangeStudent":
      return {
        ...defaultCapabilities,
        canSubmitClubIdea: true,
      };
    case "Professor":
    case "Teacher":
      return {
        ...defaultCapabilities,
        canManageNews: true,
        canManageEvents: true,
      };
    case "Ambassador":
      return {
        ...defaultCapabilities,
        canApproveClubIdea: true,
        canManageNews: true,
        canManageEvents: true,
        canManageClubs: true,
      };
    case "Admin":
    case "SuperAdmin":
      return {
        ...defaultCapabilities,
        canSubmitClubIdea: true,
        canApproveClubIdea: true,
        canManageNews: true,
        canManageEvents: true,
        canManageClubs: true,
      };
  }
}
