import { auth, type AuthUser } from "@/auth";
import { requireWriterStudioAccess } from "@/lib/utils";

/**
 * Page-level guard for every Writer Studio page. Layouts are not re-run on
 * client-side navigation, so pages call this themselves. Redirects signed-out
 * visitors to sign-in and non-writers to /become-author.
 */
export async function requireStudioUser(): Promise<AuthUser> {
  const session = await auth();
  requireWriterStudioAccess(session);
  // requireWriterStudioAccess redirects (throws) when there is no user.
  return session!.user;
}
