import { NextResponse } from "next/server";
import { z } from "zod";
import { serializeAiUsageTag } from "@/lib/ai-usage";
import {
  badRequest,
  cleanOptionalText,
  conflict,
  isUniqueConstraintError,
  optionalCount,
  optionalText,
  parseJsonBody,
  serverError,
} from "@/lib/api/writer-studio-request";
import { apiError, requireApiRole, requireOwnedSeries } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { SEASON_TRANSACTION, createEpisodeInSeason } from "@/lib/seasons";
import { decideImageField } from "@/lib/uploads/image-storage";

// authorId, status, locked, counters, timestamps and the episode's number are
// server-controlled and stripped by the schema: a new episode goes at the end
// of the chosen season, or the latest one (lib/seasons.ts).
const createEpisodeSchema = z.object({
  seriesId: z.string().min(1).max(191),
  seasonId: z.string().min(1).max(191).optional(),
  title: optionalText,
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

  const cover = decideImageField(input.coverImage, null);
  if (!cover.ok) return badRequest(cover.message);

  try {
    const episode = await prisma.$transaction(
      (tx) =>
        createEpisodeInSeason(tx, owned.series.id, input.seasonId ?? null, (place) =>
          tx.episode.create({
            data: {
              seriesId: owned.series.id,
              authorId: guard.user.id,
              title: cleanOptionalText(input.title) || "Untitled Episode",
              episodeNumber: place.episodeNumber,
              seasonId: place.seasonId,
              seasonEpisodeNumber: place.seasonEpisodeNumber,
              description: cleanOptionalText(input.description),
              contentWarning: cleanOptionalText(input.contentWarning),
              body: input.body || "",
              teaser: null,
              coverImage: cover.value ?? null,
              readTime: input.readTime ?? 5,
              locked: false,
              status: "DRAFT",
              aiUsageTag: serializeAiUsageTag(input.aiUsageTag),
            },
          }),
        ),
      SEASON_TRANSACTION,
    );
    // A season id that isn't one of this series' seasons (another writer's included).
    if (!episode) return apiError("NOT_FOUND", "Season not found.");

    return NextResponse.json({ success: true, episode });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflict("An episode with that number already exists in this series.");
    }

    console.error("Writer Studio episode creation failed.", error);
    return serverError();
  }
}
