import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  const { episodeId } = await req.json();

  // Log ad impression
  await prisma.adImpression.create({
    data: {
      userId: session?.user?.id,
      episodeId
    }
  });

  // Log revenue event
  await prisma.revenueEvent.create({
    data: {
      type: "AD_WATCH",
      amount: 1, // placeholder, CEO can adjust later
      userId: session?.user?.id,
      episodeId
    }
  });

  return Response.json({ success: true });
}
