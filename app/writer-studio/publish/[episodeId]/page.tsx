import { redirect } from "next/navigation";
import { auth } from "@/auth";
import PublishEpisodeForm from "@/components/writer-studio/PublishEpisodeForm";
import { prisma } from "@/lib/prisma";
import { requireWriterStudioAccess } from "@/lib/utils";

export default async function PublishEpisodePage({
  params,
}: {
  params: { episodeId: string };
}) {
  const session = await auth();
  requireWriterStudioAccess(session);

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/writer-studio");
  }

  const episode = await prisma.episode.findFirst({
    where: {
      id: params.episodeId,
      authorId: session.user.id,
    },
    include: {
      series: true,
    },
  });

  if (!episode) {
    return <p className="theme-meta">Episode not found.</p>;
  }

  return (
    <PublishEpisodeForm
      episode={{
        id: episode.id,
        title: episode.title,
        description: episode.description || "",
        coverImage: episode.coverImage || "",
        contentWarning: episode.contentWarning || "",
        aiUsageTag: episode.aiUsageTag,
        locked: episode.locked,
        seriesTitle: episode.series.title,
      }}
    />
  );
}
