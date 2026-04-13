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

  const updated = await prisma.settings.updateMany({
    data: body
  });

  return Response.json({ success: true });
}
