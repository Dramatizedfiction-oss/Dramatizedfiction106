import { prisma } from "@/lib/prisma";

/*
 * The avatar library as members see it: the pictures Board/CEO add in
 * Administration > Avatars. Members choose their profile picture from here (or
 * the role default); they don't upload their own.
 *
 * Library images are shared, so code that cleans up "replaced" images must
 * never delete one of these (see isLibraryImagePath).
 */

export async function listLibraryAvatars() {
  return prisma.platformAvatar.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, label: true, url: true },
  });
}

/** True when the URL is a picture currently in the library. */
export async function isLibraryAvatarUrl(url: string) {
  const found = await prisma.platformAvatar.findUnique({ where: { url }, select: { id: true } });
  return Boolean(found);
}

/** Library uploads live under /images/platform-avatar/ in blob storage. */
export function isLibraryImagePath(url: string | null | undefined) {
  if (!url) return false;
  try {
    return new URL(url).pathname.startsWith("/images/platform-avatar/");
  } catch {
    return false;
  }
}
