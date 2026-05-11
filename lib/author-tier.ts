export type AuthorVisibilityTier =
  | "Rising Author"
  | "Established Author"
  | "Featured Author"
  | "Elite Author";

export type AuthorTierSignals = {
  totalReads: number;
  engagementRate: number;
  postingConsistency: number;
  completionRate: number;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function derivePostingConsistency(totalReads: number, episodeCount = 1, followerCount = 0) {
  const cadence = clamp(episodeCount / 12) * 0.45;
  const audienceRetention = clamp(followerCount / 4000) * 0.25;
  const demandSignal = clamp(totalReads / 150000) * 0.3;
  return clamp(cadence + audienceRetention + demandSignal, 0.1, 1);
}

export function deriveAuthorTier(signals: AuthorTierSignals): AuthorVisibilityTier {
  const score =
    clamp(signals.totalReads / 180000) * 0.38 +
    clamp(signals.engagementRate) * 0.24 +
    clamp(signals.postingConsistency) * 0.18 +
    clamp(signals.completionRate) * 0.2;

  if (score >= 0.83) {
    return "Elite Author";
  }

  if (score >= 0.64) {
    return "Featured Author";
  }

  if (score >= 0.42) {
    return "Established Author";
  }

  return "Rising Author";
}

export function getAuthorTierMultiplier(tier: AuthorVisibilityTier) {
  switch (tier) {
    case "Elite Author":
      return 1.18;
    case "Featured Author":
      return 1.11;
    case "Established Author":
      return 1.05;
    case "Rising Author":
    default:
      return 1;
  }
}
