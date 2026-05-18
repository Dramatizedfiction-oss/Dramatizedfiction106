import { auth } from "@/auth";
import { serializeAiUsageTag } from "@/lib/ai-usage";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createEpisodeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().optional(),
  bodyText: z.string().optional(),
  teaser: z.string().optional().nullable(),
  readTime: z.number().min(0, "Read time must be positive"),
  episodeNumber: z.number().optional(),
  seriesId: z.string().min(1, "Series ID is required"),
  aiUsageTag: z.string().optional(),
}).refine(
  (data) => data.body || data.bodyText,
  { message: "Either body or bodyText must be provided" }
);

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  let parsedData;
  try {
    const rawData = await req.json();
    parsedData = createEpisodeSchema.parse(rawData);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : "Invalid request data" },
      { status: 400 }
    );
  }

  const { title, body, bodyText, teaser, readTime, episodeNumber, seriesId, aiUsageTag } = parsedData;

  const latestEpisode = await prisma.episode.findFirst({
    where: { seriesId },
    orderBy: { episodeNumber: "desc" },
    select: { episodeNumber: true }
  });

  await prisma.episode.create({
    data: {
      title,
      body: body ?? bodyText ?? "",
      teaser: teaser || null,
      aiUsageTag: serializeAiUsageTag(aiUsageTag),
      readTime,
      episodeNumber: episodeNumber ?? (latestEpisode?.episodeNumber ?? 0) + 1,
      seriesId,
      authorId: session.user.id
    }
  });

  return Response.json({ success: true });
}

export async function GET() {
  const episodes = await prisma.episode.findMany({
    orderBy: { createdAt: "desc" }
  });

  return Response.json(episodes);
}
