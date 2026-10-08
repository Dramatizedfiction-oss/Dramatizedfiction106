import { NextResponse } from "next/server";
import { z } from "zod";
import { serializeAiUsageTag } from "@/lib/ai-usage";
import {
  badRequest,
  cleanOptionalText,
  optionalText,
  parseJsonBody,
  resolveLockedUpdate,
  serverError,
} from "@/lib/api/writer-studio-request";
import { requireApiRole, requireOwnedEpisode, requireOwnedSeries } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { decideImageField, deleteReplacedImage } from "@/lib/uploads/image-storage";

// The only route that publishes. status/publishedAt are set here by the
// server; client-sent status, authorId, seriesId, counters are stripped.
const publishEpisodeSchema = z.object({
  title: optionalText,
  description: optionalText,
  coverImage: optionalText,
  contentWarning: optionalText,
  aiUsageTag: optionalText,
  locked: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { episodeId: string } },
) {
  const guard = await requireApiRole("WRITER");
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, publishEpisodeSchema);
  if (!body.ok) return body.response;

  const owned = await requireOwnedEpisode(params.episodeId, guard.user.id);
  if (!owned.ok) return owned.response;

  // Publishing also flips the parent series to PUBLISHED, so the caller must
  // own the series too (guards against episodes planted in another writer's
  // series before creation was ownership-checked).
  const ownedSeries = await requireOwnedSeries(owned.episode.seriesId, guard.user.id);
  if (!ownedSeries.ok) return ownedSeries.response;

  const input = body.data;
  const episode = owned.episode;
  const has = (key: keyof typeof input) => input[key] !== undefined && input[key] !== null;

  const cover = decideImageField(input.coverImage, episode.coverImage);
  if (!cover.ok) return badRequest(cover.message);

  try {
    const updated = await prisma.episode.update({
      where: { id: episode.id },
      data: {
        title: cleanOptionalText(input.title) || episode.title,
        description: has("description") ? cleanOptionalText(input.description) : undefined,
        coverImage: cover.value,
        contentWarning: has("contentWarning") ? cleanOptionalText(input.contentWarning) : undefined,
        aiUsageTag: input.aiUsageTag ? serializeAiUsageTag(input.aiUsageTag) : episode.aiUsageTag,
        locked: await resolveLockedUpdate(input.locked),
        status: "PUBLISHED",
        publishedAt: new Date(),
        lastSavedAt: new Date(),
      },
    });

    await prisma.series.update({
      where: { id: ownedSeries.series.id },
      data: { status: "PUBLISHED" },
    });

    await deleteReplacedImage(episode.coverImage, updated.coverImage);

    return NextResponse.json({ success: true, episode: updated, seriesId: episode.seriesId });
  } catch (error) {
    console.error("Writer Studio publish failed.", error);
    return serverError();
  }
}
