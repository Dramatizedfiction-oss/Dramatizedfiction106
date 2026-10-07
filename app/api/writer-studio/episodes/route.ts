import { NextResponse } from "next/server";
import { z } from "zod";
import { serializeAiUsageTag } from "@/lib/ai-usage";
import {
  cleanOptionalText,
  conflict,
  isUniqueConstraintError,
  optionalCount,
  optionalText,
  parseJsonBody,
  serverError,
} from "@/lib/api/writer-studio-request";
import { requireApiRole, requireOwnedSeries } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

// authorId, status, locked, counters and timestamps are server-controlled and
// stripped by the schema.
const createEpisodeSchema = z.object({
  seriesId: z.string().min(1).max(191),
  title: optionalText,
  episodeNumber: optionalCount,
  description: optionalText,
  contentWarning: optionalText,
  body: optionalText,
  coverImage: optionalText,
  aiUsageTag: optionalText,
  readTime: optionalCount,
});

export async function POST(request: Request) {
  const guard = await requireApiRole("WRITER");
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, createEpisodeSchema);
  if (!body.ok) return body.response;

  const input = body.data;

  // The parent series must belong to the caller; another writer's series is
  // reported as not found.
  const owned = await requireOwnedSeries(input.seriesId, guard.user.id);
  if (!owned.ok) return owned.response;

  try {
    const latestEpisode = await prisma.episode.findFirst({
      where: { seriesId: owned.series.id },
      orderBy: { episodeNumber: "desc" },
      select: { episodeNumber: true },
    });

    const episode = await prisma.episode.create({
      data: {
        seriesId: owned.series.id,
        authorId: guard.user.id,
        title: cleanOptionalText(input.title) || "Untitled Episode",
        episodeNumber: input.episodeNumber ?? (latestEpisode?.episodeNumber ?? 0) + 1,
        description: cleanOptionalText(input.description),
        contentWarning: cleanOptionalText(input.contentWarning),
        body: input.body || "",
        teaser: null,
        coverImage: cleanOptionalText(input.coverImage),
        readTime: input.readTime ?? 5,
        locked: false,
        status: "DRAFT",
        aiUsageTag: serializeAiUsageTag(input.aiUsageTag),
      },
    });

    return NextResponse.json({ success: true, episode });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflict("An episode with that number already exists in this series.");
    }

    console.error("Writer Studio episode creation failed.", error);
    return serverError();
  }
}
