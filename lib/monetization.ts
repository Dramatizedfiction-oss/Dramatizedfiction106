export type SubscriptionStatus = "NONE" | "ACTIVE" | "EXPIRED";

export type ContentAccessStatus = "free" | "owned" | "subscribed" | "locked";

export interface MonetizedUser {
  id: string;
  hasDramatizPlus: boolean;
  subscriptionStatus: SubscriptionStatus;
  ownedContentIds: string[];
}

export interface MonetizedContent {
  id: string;
  isFree: boolean;
  isLocked: boolean;
  price: number | null;
  creatorId: string;
}

export interface MonetizedSeries extends MonetizedContent {
  contentType: "series";
}

export interface MonetizedEpisode extends MonetizedContent {
  contentType: "episode";
  seriesId: string;
}

export interface ContentAccessResult {
  accessStatus: ContentAccessStatus;
}

export function createViewerMonetizationState(
  userId?: string | null,
  overrides?: Partial<Omit<MonetizedUser, "id">>,
): MonetizedUser | null {
  if (!userId) {
    return null;
  }

  return {
    id: userId,
    hasDramatizPlus: false,
    subscriptionStatus: "NONE",
    ownedContentIds: [],
    ...overrides,
  };
}

export function canUserAccessContent(
  user: MonetizedUser | null | undefined,
  content: MonetizedContent,
): ContentAccessResult {
  if (content.isFree || !content.isLocked) {
    return { accessStatus: "free" };
  }

  if (user?.ownedContentIds.includes(content.id)) {
    return { accessStatus: "owned" };
  }

  if (user?.hasDramatizPlus && user.subscriptionStatus === "ACTIVE") {
    return { accessStatus: "subscribed" };
  }

  return { accessStatus: "locked" };
}
