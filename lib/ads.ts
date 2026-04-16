import { prisma } from "@/lib/prisma";
import { isPhaseThreeActive } from "@/lib/phases";

export async function canAccessEpisode(userId: string | null, episodeId: string) {
  const adsPhaseActive = await isPhaseThreeActive();

  if (!adsPhaseActive) return true;

  // Subscribers skip ads
  if (userId) {
    const sub = await prisma.subscription.findFirst({
      where: { userId, active: true }
    });
    if (sub) return true;
  }

  // Check if user watched an ad for this episode
  if (userId) {
    const impression = await prisma.adImpression.findFirst({
      where: { userId, episodeId }
    });
    if (impression) return true;
  }

  // Not allowed yet
  return false;
}
