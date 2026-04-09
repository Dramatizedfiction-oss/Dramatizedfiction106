import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AuthorProfilePage({ params }) {
  const author = await prisma.user.findUnique({
    where: { id: params.authorId },
    include: {
      series: { orderBy: { createdAt: "desc" } },
      books: { orderBy: { createdAt: "desc" } } // ⭐ NEW
    }
  });

  if (!author) {
    return <div className="p-8">Author not found.</div>;
  }

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-10">
      {/* Header */}
      <div className="flex items-center gap-6">
        <img
          src={author.avatarUrl || "/default-avatar.png"}
          alt={author.name}
          className="w-24 h-24 rounded-full object-cover border border-slate-700"
        />

        <div>
          <h1 className="text-3xl font-bold">{author.name}</h1>
          {author.bio && (
            <p className="text-slate-400 mt-2">{author.bio}</p>
          )}
        </div>
      </div>

      {/* Series Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Series by {author.name}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {author.series.map((s) => (
            <Link
              key={s.id}
              href={`/series/${s.id}`}
              className="p-4 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition"
            >
              <h3 className="text-xl font-semibold">{s.title}</h3>
              <p className="text-slate-400 text-sm mt-2">{s.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ⭐ Books Section (Optional) */}
      {author.books.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">Books by {author.name}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {author.books.map((b) => (
              <div
                key={b.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-lg"
              >
                {b.coverUrl && (
                  <img
                    src={b.coverUrl}
                    alt={b.title}
                    className="w-full h-48 object-cover rounded mb-4"
                  />
                )}

                <h3 className="text-xl font-semibold">{b.title}</h3>
                <p className="text-slate-400 text-sm mt-2">{b.description}</p>

                <span className="inline-block mt-3 px-3 py-1 text-xs rounded bg-slate-800 border border-slate-700">
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
