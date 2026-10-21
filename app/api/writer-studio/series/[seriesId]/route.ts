import { NextResponse } from "next/server";
import { z } from "zod";
import { serializeAiUsageTag } from "@/lib/ai-usage";
import {
  badRequest,
  cleanOptionalText,
  optionalText,
  parseJsonBody,
  serverError,
} from "@/lib/api/writer-studio-request";
import { requireApiRole, requireOwnedSeries } from "@/lib/auth/guards";
import { refreshSeriesInFeed } from "@/lib/feed/invalidate";
import { prisma } from "@/lib/prisma";
import { parseSeriesTags } from "@/lib/series-tags";
import { decideImageField, deleteReplacedImage } from "@/lib/uploads/image-storage";

// Editing is not publishing: `status` is not accepted here (a series becomes
// PUBLISHED only through the episode publish route). authorId, counters and
// timestamps are server-controlled and stripped by the schema.
const updateSeriesSchema = z.object({
  title: optionalText,
  description: optionalText,
  genre: optionalText,
  coverImage: optionalText,
  themeColor: optionalText,
  aiUsageTag: optionalText,
  isComplete: z.boolean().optional(),
  // Sub tags: checked against the fixed list in lib/series-tags.ts below.
  tags: z.array(z.string().max(60)).max(10).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { seriesId: string } },
) {
  const guard = await requireApiRole("WRITER");
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, updateSeriesSchema);
  if (!body.ok) return body.response;

  const owned = await requireOwnedSeries(params.seriesId, guard.user.id);
  if (!owned.ok) return owned.response;

  const input = body.data;

  // Omitted fields are left unchanged. Blank title/description/genre keep the
  // current value; blank cover/theme clear it.
  const has = (key: keyof typeof input) => input[key] !== undefined && input[key] !== null;

  // A new cover must be an uploaded image; the stored one may be kept as is.
  const cover = decideImageField(input.coverImage, owned.series.coverImage);
  if (!cover.ok) return badRequest(cover.message);

  const tags = input.tags === undefined ? null : parseSeriesTags(input.tags);
  if (tags && !tags.ok) return badRequest(tags.message);

  try {
    const updated = await prisma.series.update({
      where: { id: owned.series.id },
      data: {
        title: cleanOptionalText(input.title) || undefined,
        description: cleanOptionalText(input.description) || undefined,
        genre: cleanOptionalText(input.genre) || undefined,
        coverImage: cover.value,
        themeColor: has("themeColor") ? cleanOptionalText(input.themeColor) : undefined,
        aiUsageTag: input.aiUsageTag ? serializeAiUsageTag(input.aiUsageTag) : undefined,
        isComplete: input.isComplete,
        // When it was finished, for the feed's Fresh Finishes (Sweep C).
        completedAt:
          input.isComplete === undefined || input.isComplete === owned.series.isComplete
            ? undefined
            : input.isComplete
              ? new Date()
              : null,
        tags: tags?.ok ? tags.tags : undefined,
      },
    });

    await deleteReplacedImage(owned.series.coverImage, updated.coverImage);
    // Genre, tags, completion and title show in the feed: refresh this series there.
    if (updated.status === "PUBLISHED") await refreshSeriesInFeed(updated.id);

    return NextResponse.json({ success: true, series: updated });
  } catch (error) {
    console.error("Writer Studio series update failed.", error);
    return serverError();
  }
}
