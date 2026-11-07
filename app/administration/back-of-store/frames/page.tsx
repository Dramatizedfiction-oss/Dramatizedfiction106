import Link from "next/link";
import { auth } from "@/auth";
import FrameManager from "@/components/admin/FrameManager";
import { prisma } from "@/lib/prisma";
import { BACK_OF_STORE_PATH } from "@/lib/store/rules";
import { requireAdministrationPage } from "@/lib/utils";

/* Administration › Back of the store › Frames (Sweep I): Board and CEO. */
export default async function BackOfStoreFramesPage() {
  requireAdministrationPage(await auth(), `${BACK_OF_STORE_PATH}/frames`);
  const items = await prisma.storeItem.findMany({
    where: { category: "FRAME" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, imageUrl: true, active: true, _count: { select: { selectedBy: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <nav aria-label="Breadcrumb" className="theme-meta text-sm">
          <Link href={BACK_OF_STORE_PATH} className="inline-flex min-h-11 min-w-11 items-center font-semibold text-[var(--text-primary)] underline underline-offset-4">
            Back of the store
          </Link>
          <span aria-hidden className="mx-2">
            ›
          </span>
          <span aria-current="page">Frames</span>
        </nav>
        <h2 className="font-heading theme-heading text-2xl font-semibold">Frames</h2>
      </div>
      <FrameManager items={items.map((item) => ({ id: item.id, name: item.name, imageUrl: item.imageUrl, active: item.active, wearers: item._count.selectedBy }))} />
    </div>
  );
}
