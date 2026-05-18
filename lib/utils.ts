import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { hasRoleAccess, type AppRole } from "@/lib/roles";

export function requireRole(session: Session | null, roles: AppRole[]) {
  if (!session?.user?.role) {
    redirect("/sign-in");
  }

  const allowed = roles.some((role) => hasRoleAccess(session.user.role, role));

  if (!allowed) {
    redirect("/explore");
  }
}
