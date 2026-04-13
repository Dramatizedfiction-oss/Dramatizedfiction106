import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await auth();
  requireRole(session, ["AUTHOR", "ADMIN", "CEO"]);

  const body = await req.json();
  const { title, episodeNumber, bodyText, teaser, readTime, seriesId } = body;

  const episode = await prisma.episode.create({
    data: {
      title,
      episodeNumber,
      body: bodyText,
      teaser,
      readTime,
      seriesId,
      authorId: session.user.id
    }
  });

  return Response.json(episode);
}

export async function GET() {
  const episodes = await prisma.episode.findMany({
    orderBy: { createdAt: "desc" }
  });

  return Response.json(episodes);
}
