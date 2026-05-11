import type { Session } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasRoleAccess, type AppRole } from "@/lib/roles";
import { isDevModeEnabled } from "@/lib/dev-auth"; // DEV ONLY

// DEV ONLY: Check if dev session is active via cookies
function isServerDevAuthenticated(): boolean {
  try {
    const cookieStore = cookies();
    return cookieStore.get("devAuthenticated")?.value === "true";
  } catch {
    return false;
  }
}

export function requireRole(session: Session | null, roles: AppRole[]) {
  // DEV ONLY: Check if dev mode is enabled and dev session exists
  if (isDevModeEnabled() && isServerDevAuthenticated()) {
    const allowed = roles.some((role) => hasRoleAccess("CEO", role));
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
