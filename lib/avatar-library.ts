import { prisma } from "@/lib/prisma";

/*
 * The avatar library as members see it: the active avatars in the Store
 * (Administration › Back of the store, Sweep B3/D), in the Store's order. Members choose
 * their profile picture from here (the Store page or /reader/avatar), or use
 * the role default or their own photo.
 *
 * Library images are shared, so code that cleans up "replaced" images must
 * never delete one of these (see isLibraryImagePath).
 */

export async function listLibraryAvatars() {
  const items = await prisma.storeItem.findMany({
    where: { category: "AVATAR", active: true, platformAvatarId: { not: null } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { platformAvatarId: true, name: true, imageUrl: true },
  });
  return items.map((item) => ({ id: item.platformAvatarId!, label: item.name, url: item.imageUrl }));
}

/**
 * True when the URL is an avatar a member may choose now: an active Store
 * avatar. Hidden ones can't be newly chosen; members already using one keep it.
 */
export async function isLibraryAvatarUrl(url: string) {
  const found = await prisma.storeItem.findFirst({
    where: { category: "AVATAR", active: true, imageUrl: url, platformAvatar: { url } },
    select: { id: true },
  });
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
