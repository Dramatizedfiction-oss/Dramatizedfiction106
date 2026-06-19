import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type TrendingSeries = {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  reads: number;
  author: {
    name: string | null;
  };
};

async function getHomepageTrendingSeries() {
  try {
    return await prisma.series.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ reads: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        reads: true,
        author: {
          select: {
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Homepage trending data failed. Rendering safe fallback.", error);
    return [] as TrendingSeries[];
  }
}

export default async function HomePage() {
  const trendingSeries = await getHomepageTrendingSeries();
  const cards = Array.from({ length: 3 }, (_, index) => trendingSeries[index] ?? null);

  return (
    <main className="overflow-hidden">
      <section className="relative px-6 py-12 md:px-10 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_50%_0%,rgba(124,58,237,0.16),transparent_70%)]" />

        <div className="relative mx-auto max-w-6xl">
          <div className="animate-fade-in-up text-center">
            <div className="relative flex flex-col items-center justify-center pt-10 pb-8 select-none">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(124,58,237,0.12)_0%,transparent_70%)]" />

              <h1
                className="liquid-text font-heading text-center leading-none"
                style={{
                  fontSize: "clamp(3rem, 10vw, 8.5rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                }}
              >
                Dramatized
              </h1>

              <h1
                className="liquid-text font-heading text-center leading-none"
                style={{
                  fontSize: "clamp(3rem, 10vw, 8.5rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                }}
              >
                Fiction
              </h1>

              <p className="theme-meta animate-subtle-pulse mt-5 font-mono-df text-xs uppercase tracking-[0.35em] md:text-sm">
                Stories Performed in Text
              </p>
            </div>

            <p className="theme-body mx-auto mt-4 max-w-3xl text-balance text-lg md:text-xl">
              A premium platform for serialized fiction, immersive reading, and creator-led story worlds.
            </p>

            <div className="mt-8 flex justify-center">
              <Link href="/explore" className="story-button-primary min-w-[180px]">
                Explore
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-color)] px-6 py-12 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Trending</p>
              <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold md:text-5xl">
                Top stories by read count
              </h2>
            </div>
            <p className="theme-meta hidden max-w-xl text-right text-sm leading-6 md:block">
              The front page now stays cinematic and focused with just one search bar in the navbar and three ranked story cards below.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <TrendingCard series={cards[0]} rank={1} />
            <TrendingCard series={cards[1]} rank={2} />
            <TrendingCard series={cards[2]} rank={3} />
          </div>
        </div>
      </section>
    </main>
  );
}

function TrendingCard({
  series,
  rank,
}: {
  series: TrendingSeries | null;
  rank: 1 | 2 | 3;
}) {
  const label = `#${rank} Trending`;

  if (!series) {
    return (
      <div className="group overflow-hidden rounded-[30px] border border-white/10 bg-[var(--bg-secondary)] shadow-[0_24px_80px_rgba(0,0,0,0.25)] transition duration-300">
        <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-black">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.28),transparent_60%)]" />
          <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/80">
            {label}
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-5">
            <p className="font-heading text-2xl font-semibold text-white">No Series Yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              This spot is waiting for a story.
            </p>
            <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              0 reads
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/series/${series.id}`}
      className="group overflow-hidden rounded-[30px] border border-white/10 bg-[var(--bg-secondary)] shadow-[0_24px_80px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_32px_100px_rgba(0,0,0,0.38)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-900">
        {series.coverImage ? (
          <Image
            src={series.coverImage}
            alt={series.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-500/40 to-slate-950" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.88),rgba(0,0,0,0.14)_55%,rgba(0,0,0,0.18))]" />

        <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/80">
          {label}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="space-y-3">
            <p className="eyebrow text-white/60">Trending Story</p>
            <h3 className="font-heading text-3xl font-semibold leading-tight text-white line-clamp-2">
              {series.title}
            </h3>
            <p className="max-w-[32ch] text-sm leading-6 text-slate-300 line-clamp-2">
              {series.description || "A featured story climbing the charts."}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2 text-sm text-slate-200">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {series.author.name || "Anonymous Writer"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {series.reads.toLocaleString()} reads
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
