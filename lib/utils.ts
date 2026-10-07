import { redirect } from "next/navigation";
import type { AuthSession } from "@/auth";
import { hasRoleAccess, type AppRole } from "@/lib/roles";

// Page-level guard: redirects on failure. Inside app/api/* route handlers,
// migrate to the JSON 401/403 guards in lib/auth/guards.ts.
export function requireRole(session: AuthSession | null, roles: AppRole[]) {
  if (!session?.user?.role) {
    redirect("/sign-in");
  }

  const allowed = roles.some((role) => hasRoleAccess(session.user.role, role));

  if (!allowed) {
    redirect("/explore");
  }
}

export function requireWriterStudioAccess(session: AuthSession | null) {
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/writer-studio");
  }

  if (!hasRoleAccess(session.user.role, "WRITER")) {
    redirect("/become-author");
  }
}
