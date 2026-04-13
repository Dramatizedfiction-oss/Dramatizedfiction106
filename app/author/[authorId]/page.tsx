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
    return <p className="p-8 text-red-400">Author not found.</p>;
  }

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">{author.name}</h1>

      <section>
        <h2 className="text-xl font-semibold mb-2">Series</h2>
        {author.series.length === 0 && (
          <p className="text-slate-400">No series yet.</p>
        )}
        <ul className="space-y-2">
          {author.series.map((s) => (
            <li key={s.id}>
              <Link href={`/series/${s.id}`} className="text-blue-400">
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Episodes</h2>
        {author.episodes.length === 0 && (
          <p className="text-slate-400">No episodes yet.</p>
        )}
        <ul className="space-y-2">
          {author.episodes.map((e) => (
            <li key={e.id}>
              <Link href={`/episode/${e.id}`} className="text-blue-400">
                {e.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

