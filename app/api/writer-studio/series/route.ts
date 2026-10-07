import { NextResponse } from "next/server";
import { z } from "zod";
import { serializeAiUsageTag } from "@/lib/ai-usage";
import {
  cleanOptionalText,
  optionalText,
  parseJsonBody,
  serverError,
} from "@/lib/api/writer-studio-request";
import { requireApiRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

// authorId, status, counters and timestamps are server-controlled and
// stripped by the schema.
const createSeriesSchema = z.object({
  title: optionalText,
  description: optionalText,
  genre: optionalText,
  coverImage: optionalText,
  themeColor: optionalText,
  aiUsageTag: optionalText,
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

  try {
    const series = await prisma.series.create({
      data: {
        title: cleanOptionalText(input.title) || "Untitled Series",
        description: cleanOptionalText(input.description) || "Series draft",
        genre: cleanOptionalText(input.genre) || "Genre",
        tags: [],
        coverImage: cleanOptionalText(input.coverImage),
        themeColor: cleanOptionalText(input.themeColor),
        status: "DRAFT",
        aiUsageTag: serializeAiUsageTag(input.aiUsageTag),
        authorId: guard.user.id,
      },
    });

    return NextResponse.json({ success: true, series });
  } catch (error) {
    console.error("Writer Studio series creation failed.", error);
    return serverError();
  }
}
