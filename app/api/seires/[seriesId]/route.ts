import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";

export async function GET(
  req: Request,
  { params }: { params: { seriesId: string } }
) {
  const series = await prisma.series.findUnique({
    where: { id: params.seriesId },
    include: { episodes: true }
  });

  return Response.json(series);
}

export async function PATCH(
  req: Request,
  { params }: { params: { seriesId: string } }
) {
  const session = await auth();
  requireRole(session, ["AUTHOR", "ADMIN", "CEO"]);

  const body = await req.json();

  const updated = await prisma.series.update({
    where: { id: params.seriesId },
    data: body
  });

  return Response.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: { seriesId: string } }
) {
  const session = await auth();
  requireRole(session, ["ADMIN", "CEO"]);

  await prisma.series.delete({
    where: { id: params.seriesId }
  });

  return Response.json({ success: true });
}
