import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AuthorProfilePage({
  params,
}: {
  params: { authorId: string };
}) {
  const author = await prisma.user.findUnique({
    where: { id: params.authorId },
    include: {
      series: true,
      episodes: true,
    },
  });

  if (!author) {
    return <p className="theme-body p-8">Author not found.</p>;
  }

  return (
    <main className="p-8 space-y-6">
      <h1 className="theme-heading text-3xl font-bold">{author.name}</h1>

      {/* SERIES */}
      <section>
        <h2 className="theme-heading text-xl font-semibold mb-2">Series</h2>

        {author.series.length === 0 && (
          <p className="theme-meta">No series yet.</p>
        )}

        <ul className="space-y-2">
          {author.series.map(
            (s: { id: string; title: string }) => (
              <li key={s.id}>
                <Link
                  href={`/series/${s.id}`}
                  className="theme-body hover:opacity-80"
                >
                  {s.title}
                </Link>
              </li>
            )
          )}
        </ul>
      </section>

      {/* EPISODES */}
      <section>
        <h2 className="theme-heading text-xl font-semibold mb-2">Episodes</h2>

        {author.episodes.length === 0 && (
          <p className="theme-meta">No episodes yet.</p>
        )}

        <ul className="space-y-2">
          {author.episodes.map(
            (e: { id: string; title: string }) => (
              <li key={e.id}>
                <Link
                  href={`/episode/${e.id}`}
                  className="theme-body hover:opacity-80"
                >
                  {e.title}
                </Link>
              </li>
            )
          )}
        </ul>
      </section>
    </main>
  );
}


