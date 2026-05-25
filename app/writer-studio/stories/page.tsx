import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const filters = ["All", "Draft", "Published", "Hidden", "Scheduled"];

export default async function WriterStudioStoriesPage() {
  const session = await auth();
  const episodes = session?.user?.id
    ? await prisma.episode.findMany({
        where: { authorId: session.user.id },
        orderBy: { updatedAt: "desc" },
        take: 12,
        include: {
          series: {
            select: {
              title: true,
            },
          },
        },
      })
    : [];

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Stories</p>
          <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold">
            Manage your story shelf
          </h1>
          <p className="theme-meta mt-3 max-w-2xl text-sm leading-6">
            A scalable home for drafts, published pieces, hidden experiments, and scheduled releases.
          </p>
        </div>
        <Link href="/writer-studio/new-episode" className="story-button-primary">
          New Story
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
              filter === "All"
                ? "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                : "border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {episodes.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-center">
          <p className="theme-heading text-xl font-semibold">Your first story starts here.</p>
          <p className="theme-meta mx-auto mt-3 max-w-xl text-sm leading-6">
            Create a first episode or series when you are ready. This shelf will become your place for drafts, published work, hidden experiments, and scheduled releases.
          </p>
          <Link href="/writer-studio/new-episode" className="story-button-primary mt-5">
            Start First Story
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {episodes.map((story, index) => (
            <article
              key={story.id}
              className="grid gap-4 rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 sm:grid-cols-[88px_minmax(0,1fr)]"
            >
              <div
                className={`aspect-[4/5] rounded-[18px] bg-gradient-to-br ${
                  index % 3 === 0
                    ? "from-cyan-400/50 via-indigo-500/30 to-zinc-950"
                    : index % 3 === 1
                      ? "from-rose-500/55 via-red-500/20 to-neutral-950"
                      : "from-amber-300/45 via-sky-500/20 to-slate-950"
                }`}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[var(--border-color)] px-2.5 py-1 text-xs">
                    Published
                  </span>
                  <span className="theme-meta text-xs uppercase tracking-[0.18em]">
                    {story.series.title}
                  </span>
                </div>
                <h2 className="theme-heading mt-3 truncate text-lg font-semibold">{story.title}</h2>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <p className="theme-meta">Last edited: {story.updatedAt.toLocaleDateString()}</p>
                  <p className="theme-meta">Reads: {story.readerCount}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
