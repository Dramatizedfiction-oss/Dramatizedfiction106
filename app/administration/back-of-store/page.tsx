import Link from "next/link";
import { auth } from "@/auth";
import { FeatureCard } from "@/components/ui/Surface";
import { prisma } from "@/lib/prisma";
import { BACK_OF_STORE_PATH, STORE_CATEGORIES } from "@/lib/store/rules";
import { requireAdministrationPage } from "@/lib/utils";

/*
 * Administration › Back of the store (Sweep D; was Administration › Store):
 * Board and CEO. One card per Store item type (only Avatars today), each
 * opening its own management page. The public Store only browses and chooses.
 */
export default async function BackOfStorePage() {
  requireAdministrationPage(await auth(), BACK_OF_STORE_PATH);
  const groups = await prisma.storeItem.groupBy({ by: ["category", "active"], _count: { _all: true } });
  const count = (category: string, active: boolean) =>
    groups.find((group) => group.category === category && group.active === active)?._count._all ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading theme-heading text-2xl font-semibold">Back of the store</h2>
        <p className="theme-meta mt-1 max-w-2xl text-sm leading-6">
          Everything members can choose in the{" "}
          <Link href="/store" className="font-semibold text-[var(--text-primary)] underline underline-offset-4">
            Store
          </Link>{" "}
          is made and managed here. Everything is free; there are no prices.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {STORE_CATEGORIES.map((category) => {
          const shown = count(category.id, true);
          const hidden = count(category.id, false);
          return (
            <li key={category.id}>
              {/* Each item type is an entry point: a feature card. */}
              <FeatureCard href={`${BACK_OF_STORE_PATH}/${category.adminSlug}`} className="flex min-h-[96px] flex-col">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="theme-heading font-semibold">{category.label}</span>
                  <span className="font-mono-df text-xs tabular-nums text-[var(--text-muted)]">
                    {shown} in the Store{hidden ? ` · ${hidden} hidden` : ""}
                  </span>
                </span>
                <span className="theme-meta mt-1 text-sm leading-6">{category.adminDescription}</span>
              </FeatureCard>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
