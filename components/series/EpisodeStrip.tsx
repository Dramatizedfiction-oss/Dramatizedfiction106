"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import CoverImage from "@/components/series/CoverImage";
import PlaceholderArt from "@/components/series/PlaceholderArt";
import { coverThumbUrl } from "@/lib/cover-thumbs";

/*
 * The series page's episode strip: a snap-scrolling row of cards with the next
 * card peeking in. Episodes are always in order (episode 1 first); for a member
 * who has started, the card to resume wears a "Continue" badge in its own place
 * and the row scrolls to it. Progress bars only show progress. Every card is
 * the same size: the title area always takes two lines (longer titles end in
 * "…") and the progress track is always there. The ⋯ menu has its own 48px
 * button beside the title, outside the card's link.
 * The season pill (and its bottom sheet) only appears when the series has more
 * than one season. Each card's menu: Bookmark (signed-in) and Share.
 */

export type StripEpisode = {
  id: string;
  title: string;
  episodeNumber: number;
  readTime: number;
  coverImage: string | null;
  season: number;
  progress: number | null;
  bookmarked: boolean;
};

export function episodeLabel(episode: { season: number; episodeNumber: number }, multiSeason: boolean) {
  return multiSeason ? `S${episode.season} · E${episode.episodeNumber}` : `E${episode.episodeNumber}`;
}

export default function EpisodeStrip({
  seriesId,
  seriesTitle,
  seriesCover,
  themeColor,
  episodes,
  seasons,
  resumeEpisodeId,
  signedIn,
}: {
  seriesId: string;
  seriesTitle: string;
  seriesCover: string | null;
  themeColor: string | null;
  episodes: StripEpisode[];
  seasons: { number: number; count: number }[];
  resumeEpisodeId: string | null;
  signedIn: boolean;
}) {
  const multiSeason = seasons.length > 1;
  const resume = episodes.find((episode) => episode.id === resumeEpisodeId) ?? null;
  const [season, setSeason] = useState(resume?.season ?? seasons[0]?.number ?? 1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState(() => new Set(episodes.filter((episode) => episode.bookmarked).map((episode) => episode.id)));
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  const shown = episodes.filter((episode) => episode.season === season);

  // Bring the Continue card into view (instantly: the page has only just loaded).
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    const card = resume ? list?.querySelector<HTMLElement>(`[data-episode-id="${resume.id}"]`) : null;
    if (list && card) list.scrollLeft = card.offsetLeft - list.offsetLeft - Number.parseFloat(getComputedStyle(list).paddingLeft || "0");
  }, [resume, season]);

  async function toggleBookmark(episode: StripEpisode) {
    setMenu(null);
    if (!signedIn) {
      router.push(`/sign-in?callbackUrl=${encodeURIComponent(`/series/${seriesId}`)}`);
      return;
    }
    const next = !bookmarks.has(episode.id);
    const response = await fetch(`/api/me/bookmarks/${encodeURIComponent(episode.id)}`, { method: next ? "PUT" : "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setNotice("Couldn't update your bookmarks. Please try again.");
      return;
    }
    setBookmarks((current) => {
      const updated = new Set(current);
      if (next) updated.add(episode.id);
      else updated.delete(episode.id);
      return updated;
    });
    setNotice(next ? `Bookmarked “${episode.title}”.` : `Removed “${episode.title}” from your bookmarks.`);
  }

  async function share(episode: StripEpisode) {
    setMenu(null);
    const url = `${window.location.origin}/episode/${episode.id}`;
    const title = `${seriesTitle}: ${episode.title}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice("Link copied.");
    } catch {
      // Closing the share sheet isn't an error worth showing.
    }
  }

  return (
    <section aria-labelledby="episodes-heading">
      <div className="flex items-center gap-3">
        <h2 id="episodes-heading" className="font-heading theme-heading text-2xl font-semibold">
          Episodes
        </h2>
        {multiSeason ? (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            className="inline-flex min-h-11 min-w-[9rem] items-center justify-between gap-3 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--sa)]"
          >
            Season {season}
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8l5 5 5-5" />
            </svg>
          </button>
        ) : null}
        {episodes.length > 0 ? (
          <Link
            href={`/series/${seriesId}/episodes`}
            className="ml-auto inline-flex min-h-11 items-center text-sm font-semibold text-[var(--text-primary)] underline decoration-1 underline-offset-4 hover:decoration-2"
          >
            See all
          </Link>
        ) : null}
      </div>

      <p className={notice ? "theme-meta mt-2 text-sm" : "sr-only"} aria-live="polite">
        {notice ?? ""}
      </p>

      {episodes.length === 0 ? (
        <p className="theme-meta mt-4 text-sm">The first episode is coming soon.</p>
      ) : (
        <ul ref={listRef} className="scrollbar-hide -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 lg:mx-0 lg:scroll-px-0 lg:px-0">
          {shown.map((episode) => (
            <li key={episode.id} data-episode-id={episode.id} className="flex w-[72%] max-w-[300px] shrink-0 snap-start sm:w-[260px]">
              <StripCard
                episode={episode}
                continueCard={episode.id === resume?.id}
                label={episodeLabel(episode, multiSeason)}
                seriesCover={seriesCover}
                themeColor={themeColor}
                menuOpen={menu === episode.id}
                onMenu={(open) => setMenu(open ? episode.id : null)}
                bookmarked={bookmarks.has(episode.id)}
                signedIn={signedIn}
                onBookmark={() => void toggleBookmark(episode)}
                onShare={() => void share(episode)}
              />
            </li>
          ))}
        </ul>
      )}

      <BottomSheet open={sheetOpen} title="Choose a season" onClose={() => setSheetOpen(false)}>
        <ul className="space-y-1">
          {seasons.map((item) => {
            const current = item.number === season;
            return (
              <li key={item.number}>
                <button
                  type="button"
                  aria-current={current ? "true" : undefined}
                  onClick={() => {
                    setSeason(item.number);
                    setSheetOpen(false);
                  }}
                  className={`flex min-h-12 w-full items-center justify-between rounded-2xl px-4 text-left text-sm transition ${
                    current ? "bg-[color-mix(in_srgb,var(--sa)_14%,transparent)] font-semibold" : "hover:bg-[var(--panel-hover)]"
                  }`}
                >
                  <span>Season {item.number}</span>
                  <span className="theme-meta text-xs">
                    {item.count} {item.count === 1 ? "episode" : "episodes"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </section>
  );
}

function StripCard({
  episode,
  continueCard,
  label,
  seriesCover,
  themeColor,
  menuOpen,
  onMenu,
  bookmarked,
  signedIn,
  onBookmark,
  onShare,
}: {
  episode: StripEpisode;
  continueCard: boolean;
  label: string;
  seriesCover: string | null;
  themeColor: string | null;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  bookmarked: boolean;
  signedIn: boolean;
  onBookmark: () => void;
  onShare: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    function close(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !menuRef.current?.contains(event.target as Node)) onMenu(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen, onMenu]);

  const progress = episode.progress ?? 0;
  const href = `/episode/${episode.id}`;
  return (
    <article className="flex w-full flex-col overflow-hidden rounded-[20px] border border-[var(--border-color)] bg-[var(--surface-raised)] shadow-[var(--shadow-card)]">
      {/* The picture is a second way into the episode for pointers; keyboards use the title link. */}
      <Link href={href} tabIndex={-1} aria-hidden="true" className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-[var(--bg-primary)]">
          <CoverImage
            sources={[coverThumbUrl(episode.coverImage), episode.coverImage, coverThumbUrl(seriesCover), seriesCover]}
            className="absolute inset-0 h-full w-full object-cover"
            fallback={<PlaceholderArt themeColor={themeColor} number={episode.episodeNumber} kicker={label} title={episode.title} />}
          />
          {continueCard ? (
            <span className="absolute left-3 top-3 rounded-full bg-[var(--sa)] px-2.5 py-1 font-mono-df text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--sa-ink)]">
              Continue
            </span>
          ) : null}
        </div>
      </Link>
      {/* Progress (context only): how far this member is in this episode. The track is always there so every card is the same size. */}
      {signedIn ? (
        <div
          role="progressbar"
          aria-label={`${label} reading progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-1 bg-[var(--border-color)]"
        >
          <div className="h-full bg-[var(--sa)]" style={{ width: `${progress}%` }} />
        </div>
      ) : (
        <div aria-hidden="true" className="h-1" />
      )}
      <div className="flex flex-1 items-start">
        <Link href={href} className="block min-w-0 flex-1 py-4 pl-4 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]">
          <p className="theme-meta font-mono-df text-[11px] uppercase tracking-[0.16em]">{label}</p>
          {/* Always two lines tall (1.375 line height × 2), so short and long titles make the same card. */}
          <h3 className="theme-heading mt-1 line-clamp-2 min-h-[2.75em] break-words font-heading text-lg font-semibold leading-snug" title={episode.title}>
            {episode.title}
          </h3>
          <p className="theme-meta mt-1 text-sm">
            {episode.readTime} min read
            {progress >= 95 ? " · Read" : progress > 0 ? ` · ${progress}%` : ""}
          </p>
        </Link>

        <div ref={menuRef} className="relative shrink-0 p-1 pt-2">
          <button
            type="button"
            onClick={() => onMenu(!menuOpen)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`More for ${episode.title}`}
            className="flex h-12 w-12 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
              <circle cx="4.5" cy="10" r="1.6" />
              <circle cx="10" cy="10" r="1.6" />
              <circle cx="15.5" cy="10" r="1.6" />
            </svg>
          </button>
          {menuOpen ? (
            <div role="menu" className="theme-panel absolute bottom-full right-1 z-20 mb-1 w-48 overflow-hidden rounded-2xl border border-[var(--border-color)] py-1 shadow-2xl">
              <button type="button" role="menuitem" onClick={onBookmark} className="flex min-h-11 w-full items-center px-4 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--panel-hover)]">
                {!signedIn ? "Sign in to bookmark" : bookmarked ? "Remove bookmark" : "Bookmark"}
              </button>
              <button type="button" role="menuitem" onClick={onShare} className="flex min-h-11 w-full items-center px-4 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--panel-hover)]">
                Share
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}