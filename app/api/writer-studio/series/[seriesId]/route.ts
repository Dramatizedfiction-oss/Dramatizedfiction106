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

export async function PATCH(
  request: Request,
  { params }: { params: { seriesId: string } },
) {
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
        status?: "DRAFT" | "PUBLISHED";
      }
    | null;

  const series = await prisma.series.findFirst({
    where: { id: params.seriesId, authorId: session.user.id },
  });

  if (!series) {
    return NextResponse.json({ error: "Series not found." }, { status: 404 });
  }

  const updated = await prisma.series.update({
    where: { id: params.seriesId },
    data: {
      title: cleanOptionalText(body?.title) || undefined,
      description: cleanOptionalText(body?.description) || undefined,
      genre: cleanOptionalText(body?.genre) || undefined,
      coverImage: cleanOptionalText(body?.coverImage),
      themeColor: cleanOptionalText(body?.themeColor),
      aiUsageTag: body?.aiUsageTag ? serializeAiUsageTag(body.aiUsageTag) : undefined,
      status: body?.status,
    },
  });

  return NextResponse.json({ success: true, series: updated });
}
