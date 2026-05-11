export type EpisodeTransitionAdState = {
  transitionCount: number;
  adsShown: number;
  transitionsSinceLastAd: number;
  lastOutcome: "ad" | "continue" | "none";
  unlockedEpisodeIds: string[];
};

export type TransitionAdDecisionInput = {
  hasNextEpisode: boolean;
  isExempt: boolean;
  phaseThreeActive: boolean;
  currentEpisodeId: string;
  nextEpisodeId?: string | null;
  state: EpisodeTransitionAdState;
};

export type TransitionAdDecision = {
  shouldShowAd: boolean;
  reason:
    | "no-next-episode"
    | "phase-inactive"
    | "user-exempt"
    | "first-transition-grace"
    | "already-unlocked"
    | "max-ads-reached"
    | "cooldown"
    | "deterministic-skip"
    | "show-ad";
};

export const DEFAULT_AD_TRANSITION_STATE: EpisodeTransitionAdState = {
  transitionCount: 0,
  adsShown: 0,
  transitionsSinceLastAd: 99,
  lastOutcome: "none",
  unlockedEpisodeIds: [],
};

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function shouldShowTransitionAd(
  input: TransitionAdDecisionInput,
): TransitionAdDecision {
  const { hasNextEpisode, isExempt, phaseThreeActive, currentEpisodeId, nextEpisodeId, state } =
    input;

  if (!hasNextEpisode || !nextEpisodeId) {
    return { shouldShowAd: false, reason: "no-next-episode" };
  }

  if (!phaseThreeActive) {
    return { shouldShowAd: false, reason: "phase-inactive" };
  }

  if (isExempt) {
    return { shouldShowAd: false, reason: "user-exempt" };
  }

  if (state.unlockedEpisodeIds.includes(nextEpisodeId)) {
    return { shouldShowAd: false, reason: "already-unlocked" };
  }

  if (state.transitionCount < 1) {
    return { shouldShowAd: false, reason: "first-transition-grace" };
  }

  if (state.adsShown >= 3) {
    return { shouldShowAd: false, reason: "max-ads-reached" };
  }

  if (state.lastOutcome === "ad" || state.transitionsSinceLastAd < 2) {
    return { shouldShowAd: false, reason: "cooldown" };
  }

  const deterministicRoll = hashString(
    `${currentEpisodeId}:${nextEpisodeId}:${state.transitionCount}:${state.adsShown}`,
  );

  if (deterministicRoll % 2 !== 0) {
    return { shouldShowAd: false, reason: "deterministic-skip" };
  }

  return { shouldShowAd: true, reason: "show-ad" };
}

export function recordTransitionContinue(
  state: EpisodeTransitionAdState,
): EpisodeTransitionAdState {
  return {
    ...state,
    transitionCount: state.transitionCount + 1,
    transitionsSinceLastAd: state.transitionsSinceLastAd + 1,
    lastOutcome: "continue",
  };
}

export function recordTransitionAd(
  state: EpisodeTransitionAdState,
  unlockedEpisodeId: string,
): EpisodeTransitionAdState {
  return {
    ...state,
    transitionCount: state.transitionCount + 1,
    adsShown: state.adsShown + 1,
    transitionsSinceLastAd: 0,
    lastOutcome: "ad",
    unlockedEpisodeIds: Array.from(new Set([...state.unlockedEpisodeIds, unlockedEpisodeId])),
  };
}

export const DISCOVERY_AD_RULES = {
  discoveryFallbackNeverEmpty: true,
  rankingNeverEmpty: true,
  adsInterruptReading: false,
  adsBetweenEpisodesOnly: true,
  followingAffectsRecommendationsOnly: true,
  readingExperiencePriority: "clean-and-uninterrupted",
  discoveryBehavior: "dynamic-but-stable",
  monetizationBreaksUx: false,
} as const;
