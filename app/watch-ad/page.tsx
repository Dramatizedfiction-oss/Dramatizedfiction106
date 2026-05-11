"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PurchasePreviewCard from "@/components/monetization/PurchasePreviewCard";
import SubscriptionPreviewCard from "@/components/monetization/SubscriptionPreviewCard";
import {
  DEFAULT_AD_TRANSITION_STATE,
  recordTransitionAd,
  type EpisodeTransitionAdState,
} from "@/lib/ad-transition";

const storageKey = "df-episode-transition-state";

function readState(): EpisodeTransitionAdState {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) {
      return DEFAULT_AD_TRANSITION_STATE;
    }
    return {
      ...DEFAULT_AD_TRANSITION_STATE,
      ...JSON.parse(raw),
    };
  } catch {
    return DEFAULT_AD_TRANSITION_STATE;
  }
}

export default function WatchAdPage() {
  const params = useSearchParams();
  const router = useRouter();
  const episodeId = params.get("episode");
  const fromEpisodeId = params.get("from");

  async function finishAd() {
    const response = await fetch("/api/ads/impression", {
      method: "POST",
      body: JSON.stringify({ episodeId }),
    });

    if (episodeId) {
      const state = readState();
      const nextState = recordTransitionAd(state, episodeId);
      window.sessionStorage.setItem(storageKey, JSON.stringify(nextState));
    }

    if (!response.ok) {
      router.push(episodeId ? `/episode/${episodeId}` : "/");
      return;
    }

    window.location.href = `/episode/${episodeId}`;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <div className="theme-panel rounded-[28px] border border-[var(--border-color)] p-6">
        <p className="eyebrow">Episode Transition</p>
        <h1 className="font-heading theme-heading mt-3 text-3xl font-semibold">
          Watch sponsored content to continue
        </h1>
        <p className="theme-meta mt-3 text-sm leading-6">
          Sponsored content only appears between episodes. It never interrupts the reader once an episode has begun.
        </p>

        <div className="theme-panel mt-6 rounded-[24px] border border-[var(--border-color)] p-6 text-center">
          <p className="theme-meta text-sm uppercase tracking-[0.24em]">Ad Placeholder</p>
          <p className="theme-heading mt-4 text-2xl font-semibold">Sponsored content would play here</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={finishAd}
            className="story-button-primary"
          >
            Watch Ad
          </button>

          {fromEpisodeId ? (
            <Link href={`/episode/${fromEpisodeId}`} className="story-button-secondary">
              Back to Episode
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SubscriptionPreviewCard user={null} />
        <PurchasePreviewCard
          contentType="episode"
          accessStatus="locked"
          price={2.99}
        />
      </div>
    </main>
  );
}
