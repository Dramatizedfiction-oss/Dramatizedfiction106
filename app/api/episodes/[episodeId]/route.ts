import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";
import { z } from "zod";
import { NextResponse } from "next/server";

const updateEpisodeSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().optional(),
  teaser: z.string().optional().nullable(),
  readTime: z.number().min(0).optional(),
  locked: z.boolean().optional(),
  aiUsageTag: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { episodeId: string } }
) {
  const episode = await prisma.episode.findUnique({
    where: { id: params.episodeId }
  });

  if (!episode) {
    return NextResponse.json(
      { error: "Episode not found" },
      { status: 404 }
    );
  }

  return Response.json(episode);
}

export async function PATCH(
  req: Request,
  { params }: { params: { episodeId: string } }
) {
  const session = await auth();
  requireRole(session, ["WRITER"]);

  let parsedData;
  try {
    const rawData = await req.json();
    parsedData = updateEpisodeSchema.parse(rawData);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.flatten() : "Invalid request data" },
      { status: 400 }
    );
  }

  const updated = await prisma.episode.update({
    where: { id: params.episodeId },
    data: parsedData
  });

  return Response.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: { episodeId: string } }
) {
  const session = await auth();
  requireRole(session, ["BOARD"]);

  const episode = await prisma.episode.findUnique({
    where: { id: params.episodeId }
  });

  if (!episode) {
    return NextResponse.json(
      { error: "Episode not found" },
      { status: 404 }
    );
  }

  await prisma.episode.delete({
    where: { id: params.episodeId }
  });

  return Response.json({ success: true });
}
