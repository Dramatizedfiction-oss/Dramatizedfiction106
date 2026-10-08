import type { ReactNode } from "react";
import AiUsageBadge from "@/components/AiUsageBadge";

/*
 * The reader-facing presentation of one episode: header plus the paper
 * surface. Shared by the public reader (app/episode/[episodeId]) and the
 * Writer Studio preview so both render identically. Callers decide what goes
 * on the page (`children`), e.g. <EpisodeContent> or a locked notice.
 */
export default function EpisodeReadingView({
  episodeNumber,
  readTime,
  title,
  aiUsageTag,
  headerActions,
  children,
}: {
  episodeNumber: number;
  readTime: number;
  title: string;
  aiUsageTag: string;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="mb-8">
        <p className="eyebrow">
          Episode {episodeNumber} | {readTime} min read
        </p>
        <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold md:text-5xl">
          {title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <AiUsageBadge tag={aiUsageTag} />
          {headerActions}
        </div>
      </header>

      <article className="reader-paper mx-auto max-w-[760px] px-6 py-8 md:px-12 md:py-12">
        {children}
      </article>
    </>
  );
}
