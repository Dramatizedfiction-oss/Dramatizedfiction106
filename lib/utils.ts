import type { Session } from "next-auth";

export function requireRole(session: Session | null, roles: string[]) {
  if (!session || !roles.includes(session.user?.role ?? "")) {
    throw new Error("Unauthorized");
  }
}
