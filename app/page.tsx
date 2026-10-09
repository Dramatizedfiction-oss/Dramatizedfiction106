import Link from "next/link";
import { auth } from "@/auth";
import LiquidWordmark from "@/components/home/LiquidWordmark";
import CoverSeriesCard from "@/components/home/CoverSeriesCard";
import { MailIcon, SparklesIcon } from "@/components/icons";
import { prisma } from "@/lib/prisma";

type FeaturedSeries = {
  id: string;
  title: string;
  coverImage: string | null;
  genre: string;
  themeColor: string | null;
  reads: number;
  author: { name: string | null };
};

async function getFeaturedSeries() {
  try {
    return await prisma.series.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ reads: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: {
        id: true,
        title: true,
        coverImage: true,
        genre: true,
        themeColor: true,
        reads: true,
        author: { select: { name: true } },
      },
    });
  } catch (error) {
    console.error("Homepage featured data failed. Rendering safe fallback.", error);
    return [] as FeaturedSeries[];
  }
}

async function getPublishedCount() {
  try {
    return await prisma.series.count({ where: { status: "PUBLISHED" } });
  } catch {
    return 0;
  }
}

export default async function HomePage() {
  const [session, featured, publishedCount] = await Promise.all([
    auth().catch(() => null),
    getFeaturedSeries(),
    getPublishedCount(),
  ]);

  return (
    <div className="min-h-screen px-4 pb-0 sm:px-6">
      <div className="relative">
        <LiquidWordmark />
        {!session?.user ? (
          <div className="flex justify-center pb-4">
            <Link href="/sign-up" className="story-button-primary gap-2 font-mono-df text-sm">
              <MailIcon size={13} />
              Join the Story
            </Link>
          </div>
        ) : null}
      </div>

      <div className="my-2 border-t border-[var(--border-color)]" />

      <div className="mx-auto max-w-5xl pt-4 md:pt-8">
        {featured.length > 0 ? (
          <section className="mt-6 md:mt-8">
            <div className="mb-6 flex items-center gap-2">
              <SparklesIcon size={14} className="text-[var(--accent)]" />
              <h2 className="font-mono-df text-xs font-bold uppercase tracking-[0.3em] text-[var(--text-secondary)]">
                Featured Stories
              </h2>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((series, index) => (
                <CoverSeriesCard
                  key={series.id}
                  series={{
                    id: series.id,
                    title: series.title,
                    coverImage: series.coverImage,
                    genre: series.genre,
                    themeColor: series.themeColor,
                    authorName: series.author.name,
                    reads: series.reads,
                  }}
                  rank={index + 1}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="py-24 text-center">
            <p className="font-mono-df text-sm tracking-widest text-[var(--text-secondary)]">
              The stage is being set...
            </p>
          </div>
        )}

        {publishedCount > 3 ? (
          <div className="mt-10 flex justify-center">
            <Link href="/explore" className="story-button-primary font-mono-df text-sm">
              More in Explore →
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
