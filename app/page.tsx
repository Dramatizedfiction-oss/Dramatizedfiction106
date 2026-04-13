import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const session = await auth();

  let continueEpisode = null;

  if (session) {
    continueEpisode = await prisma.episode.findFirst({
      where: { readers: { some: { id: session.user.id } } },
      orderBy: { updatedAt: "desc" }
    });
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-8 space-y-6">
      <h1 className="text-5xl font-bold">DRAMATIZED</h1>
      <p className="text-slate-300 max-w-xl">
        A streaming-style fiction platform for serialized stories.
      </p>

      {continueEpisode && (
        <a
          href={`/episode/${continueEpisode.id}`}
          className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded font-semibold"
        >
          Continue Reading
        </a>
      )}

      <a
        href="/explore"
        className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded font-semibold"
      >
        Explore Stories
      </a>
    </main>
  );
}
