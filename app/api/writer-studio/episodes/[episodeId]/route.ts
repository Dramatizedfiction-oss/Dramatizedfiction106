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
  resolveLockedUpdate,
  serverError,
} from "@/lib/api/writer-studio-request";
import { requireApiRole, requireOwnedEpisode } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

// Edit/autosave. Publication state is not accepted here: the autosave's
// `status: "DRAFT"` is ignored, so saving never unpublishes, and publishing
// happens only through ./publish. seriesId, authorId, readerCount and
// timestamps are server-controlled and stripped by the schema.
const updateEpisodeSchema = z.object({
  title: optionalText,
  episodeNumber: optionalCount,
  description: optionalText,
  contentWarning: optionalText,
  body: optionalText,
  coverImage: optionalText,
  aiUsageTag: optionalText,
  readTime: optionalCount,
  locked: z.boolean().optional(),
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

  try {
    const updated = await prisma.episode.update({
      where: { id: owned.episode.id },
      data: {
        // Omitted fields are left unchanged; a blank title keeps the current
        // one, blank optional text clears it.
        title: cleanOptionalText(input.title) || undefined,
        episodeNumber: input.episodeNumber ?? undefined,
        description: has("description") ? cleanOptionalText(input.description) : undefined,
        contentWarning: has("contentWarning") ? cleanOptionalText(input.contentWarning) : undefined,
        body: typeof input.body === "string" ? input.body : undefined,
        coverImage: has("coverImage") ? cleanOptionalText(input.coverImage) : undefined,
        aiUsageTag: input.aiUsageTag ? serializeAiUsageTag(input.aiUsageTag) : undefined,
        readTime: input.readTime ?? undefined,
        locked: await resolveLockedUpdate(input.locked),
        lastSavedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, episode: updated });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return conflict("An episode with that number already exists in this series.");
    }

    console.error("Writer Studio episode update failed.", error);
    return serverError();
  }
}
