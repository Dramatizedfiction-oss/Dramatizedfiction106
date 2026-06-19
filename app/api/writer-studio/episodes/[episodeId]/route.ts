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

export async function PATCH(
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
        episodeNumber?: number;
        description?: string;
        contentWarning?: string;
        body?: string;
        coverImage?: string;
        aiUsageTag?: string;
        readTime?: number;
        status?: "DRAFT" | "REVIEW" | "PUBLISHED";
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
      title: cleanOptionalText(body?.title) || undefined,
      episodeNumber: body?.episodeNumber,
      description: cleanOptionalText(body?.description),
      contentWarning: cleanOptionalText(body?.contentWarning),
      body: typeof body?.body === "string" ? body.body : undefined,
      coverImage: cleanOptionalText(body?.coverImage),
      aiUsageTag: body?.aiUsageTag ? serializeAiUsageTag(body.aiUsageTag) : undefined,
      readTime: body?.readTime,
      status: body?.status,
      locked: typeof body?.locked === "boolean" ? body.locked : undefined,
      lastSavedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, episode: updated });
}
