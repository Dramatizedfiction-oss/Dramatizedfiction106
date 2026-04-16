import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";

export async function GET() {
  const settings = await prisma.settings.findFirst();
  return Response.json(settings);
}

export async function PATCH(req: Request) {
  const session = await auth();
  requireRole(session, ["CEO"]);

  const body = await req.json();
  const existing = await prisma.settings.findFirst();

  const updated = existing
    ? await prisma.settings.update({
        where: { id: existing.id },
        data: body
      })
    : await prisma.settings.create({
        data: body
      });

  return Response.json(updated);
}
