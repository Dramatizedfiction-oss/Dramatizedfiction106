import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeAiUsageTag } from "@/lib/ai-usage";
import { requireRole } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await auth();
  requireRole(session, ["AUTHOR", "ADMIN", "CEO"]);

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, genre, tags, coverImage, aiUsageTag } = body;

  const series = await prisma.series.create({
    data: {
      title,
      description,
      genre,
      tags,
      coverImage,
      aiUsageTag: serializeAiUsageTag(aiUsageTag),
      authorId: session.user.id
    }
  });

  return Response.json(series);
}

export async function GET() {
  const series = await prisma.series.findMany({
    orderBy: { createdAt: "desc" }
  });

  return Response.json(series);
}
