import { prisma } from "@/lib/prisma";
import { isPhaseThreeActive } from "@/lib/phases";
import type { ContentAccessStatus } from "@/lib/monetization";

export async function canAccessEpisode() {
  // Reading itself should remain uninterrupted. Ad logic now lives in the
  // episode-to-episode transition layer rather than blocking the current page.
  return true;
}

export async function canShowEpisodeTransitionAds() {
  return isPhaseThreeActive();
}

export function isUserExemptFromTransitionAds(accessStatus: ContentAccessStatus) {
  return accessStatus === "owned" || accessStatus === "subscribed";
}

export async function hasWatchedTransitionAd(userId: string | null, episodeId: string) {
  if (!userId) {
    return false;
  }

  const impression = await prisma.adImpression.findFirst({
    where: { userId, episodeId },
  });

  return Boolean(impression);
}
