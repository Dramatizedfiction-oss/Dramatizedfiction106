import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

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

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function comparePassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const derivedHash = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(
    Buffer.from(storedHash, "hex"),
    Buffer.from(derivedHash, "hex"),
  );
}
