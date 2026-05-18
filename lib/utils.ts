import { redirect } from "next/navigation";
import type { AuthSession } from "@/auth";
import { hasRoleAccess, type AppRole } from "@/lib/roles";

export function requireRole(session: AuthSession | null, roles: AppRole[]) {
  if (!session?.user?.role) {
    redirect("/sign-in");
  }

  const allowed = roles.some((role) => hasRoleAccess(session.user.role, role));

  if (!allowed) {
    redirect("/explore");
  }
}
