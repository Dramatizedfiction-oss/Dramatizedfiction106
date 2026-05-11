"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PurchasePreviewCard from "@/components/monetization/PurchasePreviewCard";
import SubscriptionPreviewCard from "@/components/monetization/SubscriptionPreviewCard";
import type { ContentAccessStatus, MonetizedUser } from "@/lib/monetization";
import {
  DEFAULT_AD_TRANSITION_STATE,
  recordTransitionContinue,
  shouldShowTransitionAd,
  type EpisodeTransitionAdState,
} from "@/lib/ad-transition";

const storageKey = "df-episode-transition-state";

type NextEpisodeSummary = {
  id: string;
  title: string;
  episodeNumber: number;
};

function readState(): EpisodeTransitionAdState {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) {
      return DEFAULT_AD_TRANSITION_STATE;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_AD_TRANSITION_STATE,
      ...parsed,
      unlockedEpisodeIds: Array.isArray(parsed?.unlockedEpisodeIds)
        ? parsed.unlockedEpisodeIds.filter((value: unknown) => typeof value === "string")
        : [],
    };
  } catch {
    return DEFAULT_AD_TRANSITION_STATE;
  }
}

function writeState(state: EpisodeTransitionAdState) {
  window.sessionStorage.setItem(storageKey, JSON.stringify(state));
}

export default function EpisodeTransitionCard({
  currentEpisodeId,
  nextEpisode,
  user,
  accessStatus,
  phaseThreeActive,
}: {
  currentEpisodeId: string;
  nextEpisode: NextEpisodeSummary | null;
  user: MonetizedUser | null;
  accessStatus: ContentAccessStatus;
  phaseThreeActive: boolean;
}) {
  const [state, setState] = useState<EpisodeTransitionAdState>(DEFAULT_AD_TRANSITION_STATE);

  useEffect(() => {
    setState(readState());
  }, []);

  const isExempt = accessStatus === "owned" || accessStatus === "subscribed";
  const decision = useMemo(
    () =>
      shouldShowTransitionAd({
        hasNextEpisode: Boolean(nextEpisode),
        isExempt,
        phaseThreeActive,
        currentEpisodeId,
        nextEpisodeId: nextEpisode?.id,
        state,
      }),
    [currentEpisodeId, isExempt, nextEpisode, phaseThreeActive, state],
  );

  if (!nextEpisode) {
    return (
      <div className="theme-panel rounded-[28px] border border-[var(--border-color)] p-5">
        <p className="eyebrow">Season Complete</p>
        <h3 className="theme-heading mt-3 text-2xl font-semibold">
          You&apos;re caught up
        </h3>
        <p className="theme-meta mt-3 text-sm leading-6">
          No next episode exists yet, so the ad transition system stays out of the way.
        </p>
      </div>
    );
  }

  function handleContinue() {
    const nextState = recordTransitionContinue(state);
    setState(nextState);
    writeState(nextState);
  }

  if (!decision.shouldShowAd) {
    return (
      <div className="theme-panel rounded-[28px] border border-[var(--border-color)] p-5">
        <p className="eyebrow">Next Episode</p>
        <h3 className="theme-heading mt-3 text-2xl font-semibold">{nextEpisode.title}</h3>
        <p className="theme-meta mt-3 text-sm leading-6">
          Continue cleanly into Episode {nextEpisode.episodeNumber}. Reading stays uninterrupted unless a controlled transition ad is actually due.
        </p>
        <Link
          href={`/episode/${nextEpisode.id}`}
          onClick={handleContinue}
          className="story-button-primary mt-5 inline-flex"
        >
          Continue to Episode {nextEpisode.episodeNumber}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="theme-panel rounded-[28px] border border-[var(--border-color)] p-5">
        <p className="eyebrow">Episode Transition</p>
        <h3 className="theme-heading mt-3 text-2xl font-semibold">
          Watch sponsored content to continue
        </h3>
        <p className="theme-meta mt-3 text-sm leading-6">
          Ads only appear between episodes, never during reading. This transition can unlock Episode {nextEpisode.episodeNumber}.
        </p>
        <Link
          href={`/watch-ad?episode=${nextEpisode.id}&from=${currentEpisodeId}`}
          className="story-button-primary mt-5 inline-flex"
        >
          Watch Ad
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SubscriptionPreviewCard user={user} />
        <PurchasePreviewCard
          contentType="episode"
          accessStatus={accessStatus}
          price={2.99}
        />
      </div>
    </div>
  );
}
