import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/utils";

export async function GET(
  req: Request,
  { params }: { params: { episodeId: string } }
) {
  const episode = await prisma.episode.findUnique({
    where: { id: params.episodeId }
  });

  return Response.json(episode);
}

export async function PATCH(
  req: Request,
  { params }: { params: { episodeId: string } }
) {
  const session = await auth();
  requireRole(session, ["AUTHOR", "ADMIN", "CEO"]);

  const body = await req.json();

  const updated = await prisma.episode.update({
    where: { id: params.episodeId },
    data: body
  });

  return Response.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: { episodeId: string } }
) {
  const session = await auth();
  requireRole(session, ["ADMIN", "CEO"]);

  await prisma.episode.delete({
    where: { id: params.episodeId }
  });

  return Response.json({ success: true });
}
