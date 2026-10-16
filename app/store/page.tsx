import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import StoreGrid from "@/components/store/StoreGrid";
import { prisma } from "@/lib/prisma";
import { STORE_CATEGORIES, parseStoreCategory } from "@/lib/store/rules";
import { listStoreItems } from "@/lib/store/service";

export const metadata: Metadata = { title: "Store" };

/*
 * The Store (Sweep B3): items members can choose, by category (only Avatars
 * today). Open to everyone; choosing needs an account. Everything is free and
 * no prices are shown. Writer frames are earned by level, not sold here.
 */
export default async function StorePage({ searchParams }: { searchParams?: { category?: string } }) {
  const category = parseStoreCategory(searchParams?.category);
  const info = STORE_CATEGORIES.find((item) => item.id === category)!;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;

  const [items, member] = await Promise.all([
    listStoreItems(category),
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { image: true, avatarOriginalUrl: true } }) : null,
  ]);

  return (
    <main className="px-4 py-6 md:px-6 md:py-10 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="eyebrow">Store</p>
        <h1 className="font-heading theme-heading mt-2 text-3xl font-semibold md:text-4xl">Make your profile yours</h1>
        <p className="theme-meta mt-2 max-w-2xl text-sm leading-6">Everything here is free to use. Pick something and it shows on your profile straight away.</p>

        <nav aria-label="Store categories" className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {STORE_CATEGORIES.map((item) => (
            <Link
              key={item.id}
              href={`/store?category=${item.id}`}
              aria-current={item.id === category ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition ${
                item.id === category
                  ? "border-transparent bg-[var(--text-primary)] text-[var(--bg-secondary)]"
                  : "border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--panel-hover)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <section aria-labelledby="store-category" className="mt-6">
          <h2 id="store-category" className="theme-heading text-lg font-semibold">
            {info.label}
          </h2>
          <p className="theme-meta mt-1 text-sm">{info.description}</p>
          <div className="mt-3">
            <StoreGrid
              items={items.map((item) => ({ id: item.id, name: item.name, imageUrl: item.imageUrl }))}
              currentImage={member?.image ?? null}
              hasPhoto={Boolean(member?.avatarOriginalUrl)}
              signedIn={Boolean(userId)}
              emptyText={info.empty}
            />
          </div>

          {category === "AVATAR" ? (
            <Link
              href={userId ? "/reader/avatar?tab=photo" : `/sign-in?callbackUrl=${encodeURIComponent("/reader/avatar?tab=photo")}`}
              className="theme-panel-hover mt-6 flex min-h-[72px] items-center gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 transition"
            >
              <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--border-strong)] text-xl text-[var(--text-secondary)]">
                +
              </span>
              <span className="min-w-0 flex-1">
                <span className="theme-heading block text-sm font-semibold">Use your own photo</span>
                <span className="theme-meta mt-0.5 block text-xs leading-5">Upload a picture, then move and zoom it inside the circle.</span>
              </span>
              <span aria-hidden className="text-lg text-[var(--text-muted)]">
                ›
              </span>
            </Link>
          ) : null}
        </section>
      </div>
    </main>
  );
}
