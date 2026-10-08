import Link from "next/link";
import type { ReactNode } from "react";
import AiUsageBadge from "@/components/AiUsageBadge";

/*
 * The reader-facing presentation of one episode: a centered reading column
 * (no card around the story), a compact header, an ornament, then the body.
 * Shared by the public reader (app/episode/[episodeId]) and the Writer Studio
 * preview so both render identically. Callers supply the body (`children`),
 * e.g. <EpisodeContent> or a "not available" notice.
 */
export default function EpisodeReadingView({
  seriesTitle,
  seriesHref,
  authorName,
  authorHref,
  episodeNumber,
  readTime,
  title,
  aiUsageTag,
  contentWarning,
  headerActions,
  children,
}: {
  seriesTitle: string;
  seriesHref?: string;
  authorName?: string | null;
  authorHref?: string;
  episodeNumber: number;
  readTime: number;
  title: string;
  aiUsageTag: string;
  contentWarning?: string | null;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="reader-column">
      <header className="pt-10 text-center md:pt-16">
        {seriesHref ? (
          <Link href={seriesHref} className="reader-kicker inline-block py-2 transition hover:opacity-80">
            {seriesTitle}
          </Link>
        ) : (
          <p className="reader-kicker">{seriesTitle}</p>
        )}

        <h1 className="mx-auto mt-4 max-w-[18ch] text-balance font-heading text-[clamp(2rem,1.45rem+2.6vw,3.1rem)] font-semibold leading-[1.12] text-[var(--paper-ink)]">
          {title}
        </h1>

        <p className="reader-meta mt-4">
          {authorName ? (
            <>
              by{" "}
              {authorHref ? (
                <Link href={authorHref} className="font-semibold text-[var(--paper-ink)] hover:underline">
                  {authorName}
                </Link>
              ) : (
                <span className="font-semibold text-[var(--paper-ink)]">{authorName}</span>
              )}
              <span aria-hidden> · </span>
            </>
          ) : null}
          Episode {episodeNumber}
          <span aria-hidden> · </span>
          {readTime} min read
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <AiUsageBadge tag={aiUsageTag} compact />
          {headerActions}
        </div>

        {contentWarning ? (
          <p className="reader-meta mx-auto mt-4 max-w-md text-[0.8125rem]">
            <span className="font-semibold">Content warning:</span> {contentWarning}
          </p>
        ) : null}
      </header>

      <div className="reader-ornament" aria-hidden>
        ✦ ✦ ✦
      </div>

      {children}
    </article>
  );
}
