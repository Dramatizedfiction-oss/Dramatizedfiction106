import { auth } from "@/auth";
import StoreManager from "@/components/admin/StoreManager";
import { getPlatformSettings } from "@/lib/phases";
import { prisma } from "@/lib/prisma";
import { BUILT_IN_AVATARS } from "@/lib/avatars";
import { requireAdministrationPage } from "@/lib/utils";

/* Administration › Store (Sweep B3; was Avatars): Board and CEO. */
export default async function StoreAdminPage() {
  requireAdministrationPage(await auth(), "/administration/store");
  const [items, settings] = await Promise.all([
    prisma.storeItem.findMany({
      where: { category: "AVATAR" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, platformAvatarId: true, name: true, imageUrl: true, active: true },
    }),
    getPlatformSettings(),
  ]);

  return (
    <StoreManager
      items={items.map((item) => ({ id: item.id, avatarId: item.platformAvatarId, name: item.name, imageUrl: item.imageUrl, active: item.active }))}
      readerDefaultId={settings.defaultReaderAvatarId}
      writerDefaultId={settings.defaultWriterAvatarId}
      builtIn={BUILT_IN_AVATARS}
    />
  );
}
