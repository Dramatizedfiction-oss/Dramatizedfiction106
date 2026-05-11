import {
  deriveAuthorTier,
  derivePostingConsistency,
  getAuthorTierMultiplier,
  type AuthorVisibilityTier,
} from "@/lib/author-tier";

export type DiscoveryFeedInput = {
  id: string;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  genre?: string | null;
  tags?: string[] | null;
  reads: number;
  followers: number;
  createdAt: Date;
  updatedAt: Date;
  author: {
    name?: string | null;
    writerStatus?: "BEGINNER" | "FULL" | "FEATURED" | "ELITE" | null;
    id?: string;
  };
  episodeCount?: number;
  aiUsageTag?: string | null;
};

export type RankedContent = DiscoveryFeedInput & {
  completionRate: number;
  engagementRate: number;
  recencyScore: number;
  postingConsistency: number;
  authorTier: AuthorVisibilityTier;
  authorTierMultiplier: number;
  visibilityScore: number;
  rankingScore: number;
  engagementLabel: string;
};

export type DiscoveryFeedSection = {
  key: "trending" | "rising" | "engaged" | "recent";
  title: string;
  description: string;
  items: RankedContent[];
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function deriveCompletionRate(item: DiscoveryFeedInput) {
  const episodeCount = item.episodeCount ?? 1;
  const episodeFactor = Math.min(episodeCount, 12) * 0.025;
  const readsFactor = clamp(item.reads / 120000) * 0.18;
  return clamp(0.42 + episodeFactor + readsFactor, 0.35, 0.96);
}

function deriveEngagementRate(item: DiscoveryFeedInput) {
  const followerRatio = item.reads > 0 ? item.followers / item.reads : item.followers / 100;
  const followerScore = clamp(followerRatio * 4.2) * 0.5;
  const audienceScore = clamp(item.followers / 5000) * 0.22;
  const readsScore = clamp(item.reads / 80000) * 0.14;
  return clamp(0.14 + followerScore + audienceScore + readsScore, 0.1, 0.94);
}

function deriveRecencyScore(item: DiscoveryFeedInput) {
  const ageMs = Date.now() - item.updatedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return clamp(1 - ageDays / 45, 0.08, 1);
}

function getEngagementLabel(item: {
  engagementRate: number;
  recencyScore: number;
  visibilityScore: number;
}) {
  if (item.recencyScore > 0.82 && item.engagementRate > 0.55) {
    return "Rising fast";
  }

  if (item.engagementRate > 0.68) {
    return "Highly engaged";
  }

  if (item.visibilityScore > 0.72) {
    return "Reader favorite";
  }

  return "Building momentum";
}

export function rankDiscoveryContent(items: DiscoveryFeedInput[]): RankedContent[] {
  return [...items]
    .map((item) => {
      const completionRate = deriveCompletionRate(item);
      const engagementRate = deriveEngagementRate(item);
      const recencyScore = deriveRecencyScore(item);
      const postingConsistency = derivePostingConsistency(
        item.reads,
        item.episodeCount ?? 1,
        item.followers,
      );
      const authorTier = deriveAuthorTier({
        totalReads: item.reads,
        engagementRate,
        postingConsistency,
        completionRate,
      });
      const authorTierMultiplier = getAuthorTierMultiplier(authorTier);
      const readsScore = clamp(item.reads / 150000);
      const visibilityScore = clamp(
        readsScore * 0.32 +
          completionRate * 0.22 +
          engagementRate * 0.21 +
          recencyScore * 0.15,
      );
      const rankingScore = clamp(visibilityScore * authorTierMultiplier);

      return {
        ...item,
        completionRate,
        engagementRate,
        recencyScore,
        postingConsistency,
        authorTier,
        authorTierMultiplier,
        visibilityScore,
        rankingScore,
        engagementLabel: getEngagementLabel({
          engagementRate,
          recencyScore,
          visibilityScore,
        }),
      };
    })
    .sort((a, b) => b.visibilityScore - a.visibilityScore || b.reads - a.reads);
}

function uniqueById(items: RankedContent[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function pickSectionItems(primary: RankedContent[], fallback: RankedContent[], count = 6) {
  const resolved = uniqueById(primary).slice(0, count);
  if (resolved.length > 0) {
    return resolved;
  }
  return uniqueById(fallback).slice(0, count);
}

export function buildDiscoveryFeedSections(items: DiscoveryFeedInput[]): DiscoveryFeedSection[] {
  const rankedContentList = rankDiscoveryContent(items);
  const trendingFallback = rankedContentList
    .slice()
    .sort((a, b) => b.reads - a.reads || b.visibilityScore - a.visibilityScore);

  const rising = rankedContentList
    .slice()
    .sort(
      (a, b) =>
        b.recencyScore * 0.55 +
          b.engagementRate * 0.45 -
          (a.recencyScore * 0.55 + a.engagementRate * 0.45),
    );

  const mostEngaged = rankedContentList
    .slice()
    .sort(
      (a, b) =>
        b.engagementRate * 0.7 + b.completionRate * 0.3 -
        (a.engagementRate * 0.7 + a.completionRate * 0.3),
    );

  const recentReleases = rankedContentList
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return [
    {
      key: "trending",
      title: "Trending Now",
      description: "The stories readers are opening most right now.",
      items: pickSectionItems(trendingFallback, rankedContentList),
    },
    {
      key: "rising",
      title: "Rising Content",
      description: "Fresh momentum from newer series catching attention fast.",
      items: pickSectionItems(rising, trendingFallback),
    },
    {
      key: "engaged",
      title: "Most Engaged",
      description: "Stories holding readers deepest through each release.",
      items: pickSectionItems(mostEngaged, trendingFallback),
    },
    {
      key: "recent",
      title: "Recent Releases",
      description: "Newest arrivals across the platform, ordered by freshness.",
      items: pickSectionItems(recentReleases, trendingFallback),
    },
  ];
}
