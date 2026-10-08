"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ContentAccessStatus } from "@/lib/monetization";
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
  accessStatus,
  phaseThreeActive,
}: {
  currentEpisodeId: string;
  nextEpisode: NextEpisodeSummary | null;
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
      <div className="text-center">
        <p className="reader-kicker">You&apos;re caught up</p>
        <p className="reader-meta mt-2">This is the latest episode. New episodes appear in the series.</p>
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
      <div className="text-center">
        <p className="reader-kicker">Next · Episode {nextEpisode.episodeNumber}</p>
        <p className="mx-auto mt-2 max-w-[24ch] text-balance font-heading text-2xl font-semibold leading-tight text-[var(--paper-ink)]">
          {nextEpisode.title}
        </p>
        <Link
          href={`/episode/${nextEpisode.id}`}
          onClick={handleContinue}
          className="story-button-primary mt-5 inline-flex"
        >
          Continue reading →
        </Link>
      </div>
    );
  }

  return (
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
  );
}
