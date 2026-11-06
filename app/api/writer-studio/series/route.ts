import { NextResponse } from "next/server";
import { z } from "zod";
import { serializeAiUsageTag } from "@/lib/ai-usage";
import {
  badRequest,
  cleanOptionalText,
  STUDIO_TEXT_LIMITS,
  boundedText,
  parseJsonBody,
  serverError,
} from "@/lib/api/writer-studio-request";
import { requireApiRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { rateLimitedResponse, takeRateLimit } from "@/lib/rate-limit";
import { STUDIO_CREATE_RATE_LIMITS } from "@/lib/rate-limit-rules";
import { decideImageField } from "@/lib/uploads/image-storage";

// authorId, status, counters and timestamps are server-controlled and
// stripped by the schema.
const createSeriesSchema = z.object({
  title: boundedText(STUDIO_TEXT_LIMITS.seriesTitle),
  description: boundedText(STUDIO_TEXT_LIMITS.seriesDescription),
  genre: boundedText(STUDIO_TEXT_LIMITS.genre),
  coverImage: boundedText(STUDIO_TEXT_LIMITS.imageUrl),
  themeColor: boundedText(STUDIO_TEXT_LIMITS.themeColor),
  aiUsageTag: boundedText(STUDIO_TEXT_LIMITS.aiUsageTag),
});

export async function GET() {
  const guard = await requireApiRole("WRITER");
  if (!guard.ok) return guard.response;

  const series = await prisma.series.findMany({
    where: { authorId: guard.user.id },
    include: {
      episodes: {
        orderBy: [{ episodeNumber: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ series });
}

export async function POST(request: Request) {
  const guard = await requireApiRole("WRITER");
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, createSeriesSchema);
  if (!body.ok) return body.response;

  const input = body.data;

  const cover = decideImageField(input.coverImage, null, "series-cover");
  if (!cover.ok) return badRequest(cover.message);
  if (!(await takeRateLimit(guard.user.id, "studio-create", STUDIO_CREATE_RATE_LIMITS))) return rateLimitedResponse();

  try {
    const series = await prisma.series.create({
      data: {
        title: cleanOptionalText(input.title) || "Untitled Series",
        description: cleanOptionalText(input.description) || "Series draft",
        genre: cleanOptionalText(input.genre) || "Genre",
        tags: [],
        coverImage: cover.value ?? null,
        themeColor: cleanOptionalText(input.themeColor),
        status: "DRAFT",
        aiUsageTag: serializeAiUsageTag(input.aiUsageTag),
        authorId: guard.user.id,
        // Every series starts with Season 1 (Sweep G); nested, so it's one transaction.
        seasons: { create: { number: 1 } },
      },
    });

    return NextResponse.json({ success: true, series });
  } catch (error) {
    console.error("Writer Studio series creation failed.", error);
    return serverError();
  }
}
