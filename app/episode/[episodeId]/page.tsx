import Link from "next/link";
import LegalFooterLinks from "@/components/legal/LegalFooterLinks";
import { getNextEpisode } from "@/lib/nextEpisode";
import { auth } from "@/auth";
import EpisodeTransitionCard from "@/components/EpisodeTransitionCard";
import EpisodeContent from "@/components/episode-content/EpisodeContent";
import EpisodeReadingView from "@/components/episode-content/EpisodeReadingView";
import ReportAiTagButton from "@/components/ReportAiTagButton";
import ReaderChrome from "@/components/ReaderChrome";
import ReadTracker from "@/components/ReadTracker";
import ReadingProgressTracker from "@/components/ReadingProgressTracker";
import BookmarkButton, { BookmarkProvider } from "@/components/engagement/BookmarkButton";
import CommentsSection from "@/components/engagement/CommentsSection";
import RatingControl from "@/components/engagement/RatingControl";
import { isBookmarked } from "@/lib/bookmarks";
import { listComments, listPassageComments } from "@/lib/comments";
import PassageLayer from "@/components/reader/PassageLayer";
import type { RenderedPassage } from "@/components/episode-content/EpisodeContent";
import { findOwnHighlight } from "@/lib/highlights";
import { markerBlocks, resolveAnchor, textBlocks } from "@/lib/text-anchor";
import { episodeCode, episodeHeading, seasonLabel, showSeasonCodes } from "@/lib/season-rules";
import { seasonOf } from "@/lib/series-page";
import { starColors } from "@/lib/engagement-rules";
import { viewerRating } from "@/lib/ratings";
import { hasRoleAccess } from "@/lib/roles";
import { isPhaseThreeActive } from "@/lib/phases";
import {
  canUserAccessContent,
  createViewerMonetizationState,
  type MonetizedEpisode,
} from "@/lib/monetization";
import { PUBLIC_EPISODE_WHERE } from "@/lib/content-visibility";
import { parseEpisodeHtml } from "@/lib/episode-content";
import { prisma } from "@/lib/prisma";
import { sceneBreakFor } from "@/lib/scene-breaks";
import { seriesAccentStyle } from "@/lib/series-accent";

// Sweep 3: the tab and link previews name the episode (before, every episode read "Dramatized Fiction").
// Same visibility rule as the page: only published episodes in published series.
export async function generateMetadata({ params }: { params: { episodeId: string } }) {
  const episode = await prisma.episode
    .findFirst({
      where: { id: params.episodeId, ...PUBLIC_EPISODE_WHERE },
      select: { title: true, series: { select: { title: true } } },
    })
    .catch(() => null);
  return episode ? { title: `${episode.title} · ${episode.series.title}` } : {};
}

export default async function EpisodeReaderPage({
  params,
  searchParams,
}: {
  params: { episodeId: string };
  /** Sweep I: ?highlight=<id> (your own) or ?passage=<commentId> jumps to a passage. */
  searchParams?: { highlight?: string; passage?: string };
}) {
  // Only published episodes in published series are ever readable here.
  const episode = await prisma.episode.findFirst({
    where: { id: params.episodeId, ...PUBLIC_EPISODE_WHERE },
    include: {
      series: true,
      author: { select: { id: true, name: true } },
      season: { select: { number: true, title: true } },
    },
  });

  if (!episode) {
    return (
      <main className="reader-page flex items-center justify-center px-6 py-24">
        <div className="max-w-sm text-center">
          <p className="reader-kicker">Episode not found</p>
          <h1 className="mt-3 font-heading text-3xl font-semibold text-[var(--paper-ink)]">
            This story isn&apos;t available
          </h1>
          <p className="reader-meta mt-3 leading-6">
            It may not be published yet, or the link may be wrong.
          </p>
          <Link href="/explore" className="story-button-primary mt-6 inline-flex">
            Browse stories
          </Link>
        </div>
      </main>
    );
  }

  const session = await auth();
  const viewer = createViewerMonetizationState(session?.user?.id);
  const phaseThreeActive = await isPhaseThreeActive();
  const episodeMonetization: MonetizedEpisode = {
    contentType: "episode",
    seriesId: episode.seriesId,
    id: episode.id,
    isFree: !episode.locked,
    isLocked: episode.locked,
    price: episode.locked ? 2.99 : null,
    creatorId: episode.authorId,
  };
  const accessStatus = canUserAccessContent(viewer, episodeMonetization).accessStatus;
  const canReadEpisode = accessStatus !== "locked";

  // Rendering is read-only. Reader activity is recorded separately via
  // POST /api/reads (lib/read-tracking.ts re-checks every condition).
  const viewerId = session?.user?.id;
  const trackRead =
    canReadEpisode &&
    Boolean(viewerId) &&
    viewerId !== episode.authorId &&
    viewerId !== episode.series.authorId;

  const next = await getNextEpisode(episode.seriesId, episode.episodeNumber);
  const nextEpisodeAccessStatus = next
    ? (() => {
        const nextEpisodeMonetization: MonetizedEpisode = {
          contentType: "episode",
          seriesId: next.seriesId,
          id: next.id,
          isFree: !next.locked,
          isLocked: next.locked,
          price: next.locked ? 2.99 : null,
          creatorId: next.authorId,
        };

        return canUserAccessContent(viewer, nextEpisodeMonetization).accessStatus;
      })()
    : "free";

  const seriesHref = `/series/${episode.seriesId}`;

  // Seasons (Sweep G/I): labels read "S2 E3" only when readers can tell seasons apart.
  const visibleSeasons = await prisma.season.findMany({
    where: { seriesId: episode.seriesId, episodes: { some: { status: "PUBLISHED" } } },
    select: { number: true },
  });
  const withSeasonCodes = showSeasonCodes(visibleSeasons.map((season) => season.number));
  const here = seasonOf(episode);
  const thisCode = { seasonNumber: here.season, numberInSeason: here.numberInSeason };
  const nextHere = next ? seasonOf(next) : null;
  const nextSummary = next
    ? {
        id: next.id,
        title: next.title,
        episodeNumber: next.episodeNumber,
        label: episodeHeading({ seasonNumber: nextHere!.season, numberInSeason: nextHere!.numberInSeason }, withSeasonCodes),
        seasonStart: withSeasonCodes && nextHere!.season !== here.season && next.season ? seasonLabel(next.season) : null,
      }
    : null;

  // Bookmarks, the viewer's rating and the first page of comments (one light query each).
  const isCreator = Boolean(viewerId) && (viewerId === episode.authorId || viewerId === episode.series.authorId);
  // Passages (Sweep I): the text blocks, the passage comments found in them, and a linked passage.
  const content = parseEpisodeHtml(episode.body);
  const blocks = textBlocks(content);
  const highlightParam = typeof searchParams?.highlight === "string" ? searchParams.highlight : null;
  const passageParam = typeof searchParams?.passage === "string" && searchParams.passage.length <= 191 ? searchParams.passage : null;
  const [bookmarked, myRating, firstComments, passageComments, linkedHighlight, linkedComment] = await Promise.all([
    viewerId ? isBookmarked(viewerId, episode.id) : false,
    viewerId && canReadEpisode && !isCreator ? viewerRating(viewerId, episode.id) : null,
    canReadEpisode ? listComments(episode.id) : null,
    canReadEpisode ? listPassageComments(episode.id, blocks) : [],
    viewerId && canReadEpisode && highlightParam ? findOwnHighlight(viewerId, highlightParam, episode.id) : null,
    canReadEpisode && passageParam
      ? prisma.comment.findFirst({
          where: { id: passageParam, episodeId: episode.id, removedAt: null, quote: { not: null } },
          select: { quote: true, quotePrefix: true, quoteSuffix: true },
        })
      : null,
  ]);
  const passageCounts = new Map<number, number>();
  for (const item of passageComments) passageCounts.set(item.range.block, (passageCounts.get(item.range.block) ?? 0) + 1);
  const shownMarkers = markerBlocks(passageCounts);
  const markers = Object.fromEntries([...passageCounts].filter(([block]) => shownMarkers.has(block)));
  const passages: RenderedPassage[] = passageComments.map((item) => ({ ...item.range, ids: [item.comment.id] }));
  const linked = linkedHighlight ?? linkedComment;
  const linkedRange = linked?.quote
    ? resolveAnchor(blocks, { quote: linked.quote, prefix: linked.quotePrefix ?? "", suffix: linked.quoteSuffix ?? "" })
    : null;
  if (linkedRange) passages.push({ ...linkedRange, ids: [], target: true });
  const passageTarget = linked ? { found: Boolean(linkedRange), what: linkedHighlight ? ("highlight" as const) : ("comment" as const) } : null;

  return (
    <BookmarkProvider episodeId={episode.id} initialBookmarked={bookmarked} signedIn={Boolean(viewerId)}>
      <ReaderChrome
        backHref={seriesHref}
        seriesTitle={episode.series.title}
        episodeTitle={episode.title}
        actions={<BookmarkButton variant="icon" episodeTitle={episode.title} />}
      >
        {trackRead ? <ReadTracker episodeId={episode.id} /> : null}
        {/* How far the member has read (series page progress bars); signed-in only. */}
        {viewerId && canReadEpisode ? <ReadingProgressTracker episodeId={episode.id} targetId="story-body" /> : null}
        {canReadEpisode ? (
          <PassageLayer
            episodeId={episode.id}
            rootId="story-body"
            signedIn={Boolean(viewerId)}
            target={passageTarget}
            comments={passageComments.map(({ comment, range }) => ({
              id: comment.id,
              block: range.block,
              quote: comment.passage?.quote ?? "",
              body: comment.body,
              authorName: comment.author.name || "Reader",
              createdAt: comment.createdAt,
            }))}
          />
        ) : null}
        <main className="pb-24">
          <EpisodeReadingView
            seriesTitle={episode.series.title}
            seriesHref={seriesHref}
            authorName={episode.author.name}
            authorHref={`/author/${episode.author.id}`}
            episodeNumber={episode.episodeNumber}
            episodeLabel={episodeHeading(thisCode, withSeasonCodes)}
            readTime={episode.readTime}
            title={episode.title}
            aiUsageTag={episode.aiUsageTag}
            contentWarning={episode.contentWarning}
            headerActions={<ReportAiTagButton target={{ episodeId: episode.id }} currentTag={episode.aiUsageTag} subject={episode.title} />}
          >
            {canReadEpisode ? (
              <div id="story-body" className="reading-body series-accent" style={seriesAccentStyle(episode.series.themeColor)}>
                <EpisodeContent
                  content={content}
                  sceneBreak={sceneBreakFor(episode.series.genre, episode.series.tags).design}
                  passages={passages}
                  markers={markers}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--paper-rule)] px-6 py-8 text-center">
                <p className="reader-kicker">Not available</p>
                <p className="mt-3 font-heading text-2xl font-semibold text-[var(--paper-ink)]">
                  This episode can&apos;t be read right now
                </p>
                {episode.teaser || episode.description ? (
                  <p className="reader-meta mx-auto mt-3 max-w-md leading-6">{episode.teaser || episode.description}</p>
                ) : null}
              </div>
            )}

            <footer className="mt-16">
              <div className="reader-ornament" aria-hidden>
                ✦ ✦ ✦
              </div>
              <p className="reader-meta text-center">
                End of {withSeasonCodes ? episodeCode(thisCode, true) : `Episode ${here.numberInSeason}`}
              </p>
              <div className="mt-5">
                <BookmarkButton variant="pill" episodeTitle={episode.title} />
              </div>

              {canReadEpisode ? (
                <div className="mt-12">
                  <RatingControl
                    episodeId={episode.id}
                    initialValue={myRating}
                    mode={!viewerId ? "signed-out" : isCreator ? "own" : "rate"}
                    colors={starColors(episode.series.themeColor)}
                  />
                </div>
              ) : null}

              {firstComments ? (
                <div className="mt-12 border-t border-[var(--paper-rule)] pt-10">
                  <CommentsSection
                    episodeId={episode.id}
                    initial={firstComments}
                    viewer={
                      session?.user?.id
                        ? {
                            id: session.user.id,
                            isSeriesAuthor: session.user.id === episode.series.authorId,
                            isModerator: hasRoleAccess(session.user.role, "BOARD"),
                          }
                        : null
                    }
                  />
                </div>
              ) : null}

              <div className="mt-14 border-t border-[var(--paper-rule)] pt-10">
                <EpisodeTransitionCard
                  currentEpisodeId={episode.id}
                  nextEpisode={nextSummary}
                  accessStatus={nextEpisodeAccessStatus}
                  phaseThreeActive={phaseThreeActive}
                  seriesComplete={episode.series.isComplete}
                  seriesTitle={episode.series.title}
                />
              </div>
              <p className="mt-8 text-center">
                <Link href={seriesHref} className="reader-meta inline-block px-3 py-3 underline-offset-4 hover:text-[var(--paper-ink)] hover:underline">
                  Back to {episode.series.title}
                </Link>
              </p>
              {/* The reader hides the app shell (and its footer), so the legal links live here. */}
              <LegalFooterLinks className="mt-6 [&_ul]:justify-center" />
            </footer>
          </EpisodeReadingView>
        </main>
      </ReaderChrome>
    </BookmarkProvider>
  );
}
