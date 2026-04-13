import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";
import EpisodeCard from "@/components/EpisodeCard";

export default async function WriterEpisodesPage() {
  const session = await auth();
  requireRole(session, ["AUTHOR", "ADMIN", "CEO"]);

  // NextAuth v5 safety check
  if (!session?.user?.id) {
    return <p className="p-8 text-red-400">You must be logged in.</p>;
  }

  const episodes = await prisma.episode.findMany({
    where: { authorId: session.user.id },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Episodes</h1>
        <a
          href="/episode/new"
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-semibold"
        >
          New Episode
        </a>
      </div>

      {episodes.length === 0 && (
        <p className="text-slate-400">You haven't written any episodes yet.</p>
      )}

      <div className="space-y-4">
        {episodes.map((ep) => (
          <EpisodeCard key={ep.id} episode={ep} />
        ))}
      </div>
    </main>
  );
}
