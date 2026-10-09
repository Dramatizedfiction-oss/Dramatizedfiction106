import { redirect } from "next/navigation";
import type { AuthSession, AuthUser } from "@/auth";
import { hasRoleAccess, isCEO, type AppRole } from "@/lib/roles";

// Page-level guards: they redirect on failure. Route handlers in app/api/*
// use the JSON 401/403 guards in lib/auth/guards.ts instead.

/** Where members with an active ban or discipline action are sent. */
export const RESTRICTED_PATH = "/account-restricted";

function rejectRestricted(session: AuthSession) {
  if (session.user.restriction) redirect(RESTRICTED_PATH);
}

export function requireRole(session: AuthSession | null, roles: AppRole[]) {
  if (!session?.user?.role) {
    redirect("/sign-in");
  }

  rejectRestricted(session);

  const allowed = roles.some((role) => hasRoleAccess(session.user.role, role));

  if (!allowed) {
    redirect("/explore");
  }
}

export function requireWriterStudioAccess(session: AuthSession | null) {
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/writer-studio");
  }

  // A disciplined writer loses the studio until the action ends.
  rejectRestricted(session);

  if (!hasRoleAccess(session.user.role, "WRITER")) {
    redirect("/become-author");
  }
}

/** Administration: BOARD and CEO, not restricted. */
export function requireAdministrationPage(session: AuthSession | null, callbackUrl = "/administration"): AuthUser {
  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  rejectRestricted(session);
  if (!hasRoleAccess(session.user.role, "BOARD")) {
    redirect("/explore");
  }
  return session.user;
}

/** CEO Studio: CEO only (BOARD is always refused), not restricted. */
export function requireCEOPage(session: AuthSession | null, callbackUrl = "/ceo-studio"): AuthUser {
  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  rejectRestricted(session);
  if (!isCEO(session.user.role)) {
    redirect(hasRoleAccess(session.user.role, "BOARD") ? "/administration" : "/explore");
  }
  return session.user;
}
