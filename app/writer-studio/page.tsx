import { redirect } from "next/navigation";
import { auth } from "@/auth";
import WriterStudioWorkspace from "@/components/writer-studio/WriterStudioWorkspace";
import { prisma } from "@/lib/prisma";
import { requireWriterStudioAccess } from "@/lib/utils";

export default async function WriterStudioHomePage({
  searchParams,
}: {
  searchParams?: { series?: string; episode?: string };
}) {
  const session = await auth();
  requireWriterStudioAccess(session);

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/writer-studio");
  }

  const series = await prisma.series.findMany({
    where: { authorId: session.user.id },
    include: {
      episodes: {
        orderBy: [{ episodeNumber: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  // Convert all Date objects to ISO strings
  const formattedSeries = series.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    episodes: item.episodes.map((episode) => ({
      ...episode,
      createdAt: episode.createdAt.toISOString(),
      updatedAt: episode.updatedAt.toISOString(),
      lastSavedAt: episode.lastSavedAt.toISOString(),
    })),
  }));

  return (
    <WriterStudioWorkspace
      userId={session.user.id}
      userName={session.user.name || null}
      series={formattedSeries}
      selectedSeriesId={searchParams?.series || null}
      selectedEpisodeId={searchParams?.episode || null}
    />
  );
}
