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
import { prisma } from "@/lib/prisma";
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
      },
    });

    await deleteReplacedImage(owned.series.coverImage, updated.coverImage);

    return NextResponse.json({ success: true, series: updated });
  } catch (error) {
    console.error("Writer Studio series update failed.", error);
    return serverError();
  }
}
