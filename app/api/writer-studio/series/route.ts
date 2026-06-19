import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serializeAiUsageTag } from "@/lib/ai-usage";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/utils";

function cleanOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  const session = await auth();
  requireRole(session, ["WRITER"]);

  const series = await prisma.series.findMany({
    where: { authorId: session?.user?.id || "" },
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
  const session = await auth();
  requireRole(session, ["WRITER"]);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        title?: string;
        description?: string;
        genre?: string;
        coverImage?: string;
        themeColor?: string;
        aiUsageTag?: string;
      }
    | null;

  const title = cleanOptionalText(body?.title) || "Untitled Series";
  const description = cleanOptionalText(body?.description) || "Series draft";
  const genre = cleanOptionalText(body?.genre) || "Genre";

  const series = await prisma.series.create({
    data: {
      title,
      description,
      genre,
      tags: [],
      coverImage: cleanOptionalText(body?.coverImage),
      themeColor: cleanOptionalText(body?.themeColor),
      status: "DRAFT",
      aiUsageTag: serializeAiUsageTag(body?.aiUsageTag),
      authorId: session.user.id,
    },
  });

  return NextResponse.json({ success: true, series });
}
