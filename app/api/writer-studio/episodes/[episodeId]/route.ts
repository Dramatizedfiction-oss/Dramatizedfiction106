import { NextResponse } from "next/server";
import { z } from "zod";
import { serializeAiUsageTag } from "@/lib/ai-usage";
import {
  badRequest,
  cleanOptionalText,
  conflict,
  editedElsewhere,
  isRecordNotFoundError,
  isUniqueConstraintError,
  parseBaseLastSavedAt,
  STUDIO_TEXT_LIMITS,
  boundedText,
  optionalReadTime,
  parseJsonBody,
  resolveLockedUpdate,
  serverError,
} from "@/lib/api/writer-studio-request";
import { requireApiRole, requireOwnedEpisode } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { decideImageField, deleteReplacedImage } from "@/lib/uploads/image-storage";

// Edit/autosave. Publication state is not accepted here: the autosave's
// `status: "DRAFT"` is ignored, so saving never unpublishes, and publishing
// happens only through ./publish. seriesId, authorId, readerCount and
// timestamps are server-controlled and stripped by the schema, and so are the
// episode's number and season (Sweep G: only the season routes change them,
// through lib/seasons.ts, which keeps the numbering whole).
const updateEpisodeSchema = z.object({
  title: boundedText(STUDIO_TEXT_LIMITS.episodeTitle),
  description: boundedText(STUDIO_TEXT_LIMITS.episodeDescription),
  contentWarning: boundedText(STUDIO_TEXT_LIMITS.contentWarning),
  body: boundedText(STUDIO_TEXT_LIMITS.episodeBody),
  coverImage: boundedText(STUDIO_TEXT_LIMITS.imageUrl),
  aiUsageTag: boundedText(STUDIO_TEXT_LIMITS.aiUsageTag),
  readTime: optionalReadTime,
  locked: z.boolean().optional(),
  // The lastSavedAt the editor's copy is built on (BUG-09); optional for older clients.
  baseLastSavedAt: boundedText(40),
});

export async function PATCH(
  request: Request,
  { params }: { params: { episodeId: string } },
) {
  const guard = await requireApiRole("WRITER");
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, updateEpisodeSchema);
  if (!body.ok) return body.response;

  const owned = await requireOwnedEpisode(params.episodeId, guard.user.id);
  if (!owned.ok) return owned.response;

  const input = body.data;
  const has = (key: keyof typeof input) => input[key] !== undefined && input[key] !== null;

  // A new cover must be an uploaded image; the stored one may be kept as is.
  const cover = decideImageField(input.coverImage, owned.episode.coverImage, "episode-cover");
  if (!cover.ok) return badRequest(cover.message);

  const base = parseBaseLastSavedAt(input.baseLastSavedAt);
  if (!base.ok) return badRequest("Invalid baseLastSavedAt.");

  try {
    // With a base, the row only matches if nobody saved since: one atomic
    // statement, so two saves arriving together can't both pass the check.
    const updated = await prisma.episode.update({
      where: { id: owned.episode.id, ...(base.value ? { lastSavedAt: base.value } : {}) },
      data: {
        // Omitted fields are left unchanged; a blank title keeps the current
        // one, blank optional text clears it.
        title: cleanOptionalText(input.title) || undefined,
        description: has("description") ? cleanOptionalText(input.description) : undefined,
        contentWarning: has("contentWarning") ? cleanOptionalText(input.contentWarning) : undefined,
        body: typeof input.body === "string" ? input.body : undefined,
        coverImage: cover.value,
        aiUsageTag: input.aiUsageTag ? serializeAiUsageTag(input.aiUsageTag) : undefined,
        readTime: input.readTime ?? undefined,
        locked: await resolveLockedUpdate(input.locked),
        lastSavedAt: new Date(),
      },
    });

    await deleteReplacedImage(owned.episode.coverImage, updated.coverImage);

    return NextResponse.json({ success: true, episode: updated });
  } catch (error) {
    // The episode exists and is owned (checked above), so no match means it moved on.
    if (base.value && isRecordNotFoundError(error)) return editedElsewhere();
    if (isUniqueConstraintError(error)) {
      return conflict("An episode with that number already exists in this series.");
    }

    console.error("Writer Studio episode update failed.", error);
    return serverError();
  }
}
