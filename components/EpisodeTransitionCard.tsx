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
  /** Sweep I: "S2 E1" / "Episode 4" as readers see it. */
  label?: string;
  /** Sweep I: set when the next episode opens a new season ("Season 2: The Salt War"). */
  seasonStart?: string | null;
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
  seriesComplete = false,
  seriesTitle,
}: {
  currentEpisodeId: string;
  nextEpisode: NextEpisodeSummary | null;
  accessStatus: ContentAccessStatus;
  phaseThreeActive: boolean;
  /** After the last episode of a complete series, the end-of-series state (Sweep I). */
  seriesComplete?: boolean;
  seriesTitle?: string;
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
    if (seriesComplete) {
      return (
        <div className="text-center">
          <p className="reader-kicker">The end</p>
          <p className="mx-auto mt-2 max-w-[24ch] text-balance font-heading text-2xl font-semibold leading-tight text-[var(--paper-ink)]">
            You&apos;ve finished {seriesTitle ?? "this series"}
          </p>
          <p className="reader-meta mt-2">This series is complete. Thanks for reading to the last page.</p>
        </div>
      );
    }
    return (
      <div className="text-center">
        <p className="reader-kicker">You&apos;re caught up</p>
        <p className="reader-meta mt-2">This is the latest episode. New episodes appear in the series.</p>
      </div>
    );
  }
  const nextLabel = nextEpisode.label ?? `Episode ${nextEpisode.episodeNumber}`;

  function handleContinue() {
    const nextState = recordTransitionContinue(state);
    setState(nextState);
    writeState(nextState);
  }

  if (!decision.shouldShowAd) {
    return (
      <div className="text-center">
        {nextEpisode.seasonStart ? (
          <p className="reader-meta mb-3 font-heading text-lg italic text-[var(--paper-ink)]">
            <span aria-hidden>✦ </span>
            {nextEpisode.seasonStart} begins
            <span aria-hidden> ✦</span>
          </p>
        ) : null}
        <p className="reader-kicker">Next · {nextLabel}</p>
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
        Ads only appear between episodes, never during reading. This transition can unlock {nextLabel}.
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
