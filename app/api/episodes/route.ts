import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return Response.redirect("/login");
  }

  const { title, content, readTime, seriesId } = await req.json();

  await prisma.episode.create({
    data: {
      title,
      content,
      readTime,
      seriesId,
      authorId: session.user.id
    }
  });

  return Response.json({ success: true });
}

