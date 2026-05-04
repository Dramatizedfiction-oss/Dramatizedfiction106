import { auth } from "@/auth";
import { serializeAiUsageTag } from "@/lib/ai-usage";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { title, body, bodyText, teaser, readTime, episodeNumber, seriesId, aiUsageTag } =
    await req.json();

  const latestEpisode = await prisma.episode.findFirst({
    where: { seriesId },
    orderBy: { episodeNumber: "desc" },
    select: { episodeNumber: true }
  });

  await prisma.episode.create({
    data: {
      title,
      body: body ?? bodyText ?? "",
      teaser: teaser || null,
      aiUsageTag: serializeAiUsageTag(aiUsageTag),
      readTime,
      episodeNumber: episodeNumber ?? (latestEpisode?.episodeNumber ?? 0) + 1,
      seriesId,
      authorId: session.user.id
    }
  });

  return Response.json({ success: true });
}


