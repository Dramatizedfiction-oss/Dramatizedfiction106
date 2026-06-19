import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serializeAiUsageTag } from "@/lib/ai-usage";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/utils";

function cleanOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(
  request: Request,
  { params }: { params: { episodeId: string } },
) {
  const session = await auth();
  requireRole(session, ["WRITER"]);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        title?: string;
        description?: string;
        coverImage?: string;
        contentWarning?: string;
        aiUsageTag?: string;
        locked?: boolean;
      }
    | null;

  const episode = await prisma.episode.findFirst({
    where: { id: params.episodeId, authorId: session.user.id },
  });

  if (!episode) {
    return NextResponse.json({ error: "Episode not found." }, { status: 404 });
  }

  const updated = await prisma.episode.update({
    where: { id: params.episodeId },
    data: {
      title: cleanOptionalText(body?.title) || episode.title,
      description: cleanOptionalText(body?.description),
      coverImage: cleanOptionalText(body?.coverImage),
      contentWarning: cleanOptionalText(body?.contentWarning),
      aiUsageTag: body?.aiUsageTag ? serializeAiUsageTag(body.aiUsageTag) : episode.aiUsageTag,
      locked: typeof body?.locked === "boolean" ? body.locked : episode.locked,
      status: "PUBLISHED",
      publishedAt: new Date(),
      lastSavedAt: new Date(),
    },
  });

  await prisma.series.update({
    where: { id: episode.seriesId },
    data: { status: "PUBLISHED" },
  });

  return NextResponse.json({ success: true, episode: updated, seriesId: episode.seriesId });
}
