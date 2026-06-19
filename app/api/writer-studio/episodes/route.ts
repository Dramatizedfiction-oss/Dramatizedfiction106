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

export async function POST(request: Request) {
  const session = await auth();
  requireRole(session, ["WRITER"]);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        seriesId?: string;
        title?: string;
        episodeNumber?: number;
        description?: string;
        contentWarning?: string;
        body?: string;
        coverImage?: string;
        aiUsageTag?: string;
        readTime?: number;
      }
    | null;

  if (!body?.seriesId) {
    return NextResponse.json({ error: "Series is required." }, { status: 400 });
  }

  const latestEpisode = await prisma.episode.findFirst({
    where: { seriesId: body.seriesId, authorId: session.user.id },
    orderBy: { episodeNumber: "desc" },
    select: { episodeNumber: true },
  });

  const episode = await prisma.episode.create({
    data: {
      seriesId: body.seriesId,
      authorId: session.user.id,
      title: cleanOptionalText(body.title) || "Untitled Episode",
      episodeNumber: body.episodeNumber ?? (latestEpisode?.episodeNumber ?? 0) + 1,
      description: cleanOptionalText(body.description),
      contentWarning: cleanOptionalText(body.contentWarning),
      body: body.body || "",
      teaser: null,
      coverImage: cleanOptionalText(body.coverImage),
      readTime: body.readTime ?? 5,
      locked: false,
      status: "DRAFT",
      aiUsageTag: serializeAiUsageTag(body.aiUsageTag),
    },
  });

  return NextResponse.json({ success: true, episode });
}
