import Link from "next/link";
import { auth } from "@/auth";
import StoreManager from "@/components/admin/StoreManager";
import { getPlatformSettings } from "@/lib/phases";
import { prisma } from "@/lib/prisma";
import { BUILT_IN_AVATARS } from "@/lib/avatars";
import { BACK_OF_STORE_PATH } from "@/lib/store/rules";
import { requireAdministrationPage } from "@/lib/utils";

/* Administration › Back of the store › Avatars (Sweep D; was Administration › Store, before that Avatars): Board and CEO. */
export default async function BackOfStoreAvatarsPage() {
  requireAdministrationPage(await auth(), `${BACK_OF_STORE_PATH}/avatars`);
  const [items, settings] = await Promise.all([
    prisma.storeItem.findMany({
      where: { category: "AVATAR" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, platformAvatarId: true, name: true, imageUrl: true, active: true },
    }),
    getPlatformSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <nav aria-label="Breadcrumb" className="theme-meta text-sm">
          <Link href={BACK_OF_STORE_PATH} className="inline-flex min-h-11 items-center font-semibold text-[var(--text-primary)] underline underline-offset-4">
            Back of the store
          </Link>
          <span aria-hidden className="mx-2">
            ›
          </span>
          <span aria-current="page">Avatars</span>
        </nav>
        <h2 className="font-heading theme-heading text-2xl font-semibold">Avatars</h2>
      </div>
      <StoreManager
        items={items.map((item) => ({ id: item.id, avatarId: item.platformAvatarId, name: item.name, imageUrl: item.imageUrl, active: item.active }))}
        readerDefaultId={settings.defaultReaderAvatarId}
        writerDefaultId={settings.defaultWriterAvatarId}
        builtIn={BUILT_IN_AVATARS}
      />
    </div>
  );
}
