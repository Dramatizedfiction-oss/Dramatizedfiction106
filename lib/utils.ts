import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { hasRoleAccess, type AppRole } from "@/lib/roles";
import { getEffectiveRole, isDevModeEnabled } from "@/lib/dev-auth"; // DEV ONLY

export function requireRole(session: Session | null, roles: AppRole[]) {
  // DEV ONLY: Check if dev mode is enabled and dev session exists
  if (isDevModeEnabled()) {
    const effectiveRole = getEffectiveRole(session?.user?.role);
    const allowed = roles.some((role) => hasRoleAccess(effectiveRole, role));
    if (allowed) {
      return; // Allow access
    }
  }

  // Original logic
  if (!session?.user?.role) {
    redirect("/sign-in");
  }

  const allowed = roles.some((role) => hasRoleAccess(session.user.role, role));

  if (!allowed) {
    redirect("/explore");
  }
}
