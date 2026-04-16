import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isPhaseThreeActive } from "@/lib/phases";


export async function POST(req: Request) {
  const phaseThreeActive = await isPhaseThreeActive();

  if (!phaseThreeActive) {
    return Response.json({ error: "Phase 3 is inactive" }, { status: 403 });
  }

  const session = await auth();
  const { episodeId } = await req.json();

  if (!episodeId) {
    return Response.json({ error: "Missing episodeId" }, { status: 400 });
  }

  // Log ad impression
  await prisma.adImpression.create({
    data: {
      userId: session?.user?.id ?? null,
      episodeId
    }
  });

  // Log revenue event
  await prisma.revenueEvent.create({
    data: {
      type: "AD_WATCH",
      amount: 1, // placeholder, CEO can adjust later
      userId: session?.user?.id ?? null,
      episodeId
    }
  });

  return Response.json({ success: true });
}
