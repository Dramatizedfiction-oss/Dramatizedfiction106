// Client-safe. The one rule for where a person's profile lives, used by every
// link to a profile so they always agree:
//   - writers (Writer, Board, CEO): their author profile, /author/[id], which
//     has the Writing and Reading views (?view=reading);
//   - everyone else: their reading profile, /reader/[id] (or /reader for you).
// The id always comes from the person being linked to, so a link can never
// point at another account.

import { hasRoleAccess } from "@/lib/roles";

export type ProfileView = "writing" | "reading";

export function isWriterRole(role: string | null | undefined) {
  return hasRoleAccess(role, "WRITER");
}

/** Someone's profile, as others reach it. */
export function profileHref(user: { id: string; role?: string | null }, view?: ProfileView) {
  if (isWriterRole(user.role)) return `/author/${user.id}${view === "reading" ? "?view=reading" : ""}`;
  return `/reader/${user.id}`;
}

/** Your own profile (the account menu's "Profile"). */
export function ownProfileHref(user: { id?: string | null; role?: string | null }, view?: ProfileView) {
  if (user.id && isWriterRole(user.role)) return profileHref({ id: user.id, role: user.role }, view);
  return "/reader";
}

export function parseProfileView(value: unknown): ProfileView {
  return value === "reading" ? "reading" : "writing";
}
