export const ROLE_ORDER = ["READER", "WRITER", "BOARD", "CEO"] as const;

export type AppRole = (typeof ROLE_ORDER)[number];

const ROLE_ALIASES: Record<string, AppRole> = {
  READER: "READER",
  WRITER: "WRITER",
  AUTHOR: "WRITER",
  BOARD: "BOARD",
  ADMIN: "BOARD",
  CEO: "CEO",
};

export function normalizeRole(role: string | null | undefined): AppRole {
  if (!role) {
    return "READER";
  }

  return ROLE_ALIASES[role] ?? "READER";
}

export function hasRoleAccess(
  role: string | null | undefined,
  minimumRole: AppRole,
) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "CEO") {
    return true;
  }

  return ROLE_ORDER.indexOf(normalizedRole) >= ROLE_ORDER.indexOf(minimumRole);
}
