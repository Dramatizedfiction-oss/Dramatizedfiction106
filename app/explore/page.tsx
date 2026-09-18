import ExploreBrowse from "@/components/explore/ExploreBrowse";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isWriter } from "@/lib/roles";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const session = await auth().catch(() => null);
  const query = searchParams?.q?.trim() || "";
  const showBecomeAuthorCta = Boolean(session?.user) && !isWriter(session?.user.role);

  let stories: Awaited<ReturnType<typeof loadStories>> = [];
  try {
    stories = await loadStories();
  } catch (error) {
    console.error("Explore stories failed.", error);
  }

  return (
    <ExploreBrowse
      initialQuery={query}
      showBecomeAuthorCta={showBecomeAuthorCta}
      stories={stories.map((series) => ({
        id: series.id,
        title: series.title,
        description: series.description,
        coverImage: series.coverImage,
        genre: series.genre,
        themeColor: series.themeColor,
        authorName: series.author.name,
        reads: series.reads,
        createdAt: series.createdAt.toISOString(),
      }))}
    />
  );
}

function loadStories() {
  return prisma.series.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ reads: "desc" }, { updatedAt: "desc" }],
    take: 80,
    select: {
      id: true,
      title: true,
      description: true,
      coverImage: true,
      genre: true,
      themeColor: true,
      reads: true,
      createdAt: true,
      author: {
        select: { name: true },
      },
    },
  });
}
