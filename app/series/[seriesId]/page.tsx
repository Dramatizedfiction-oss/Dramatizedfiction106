import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import AiTagBanner from "@/components/AiTagBanner";
import FramedAvatar from "@/components/avatar/FramedAvatar";
import FollowSeriesButton from "@/components/follow/FollowSeriesButton";
import ReportAiTagButton from "@/components/ReportAiTagButton";
import CoverImage from "@/components/series/CoverImage";
import EpisodeStrip from "@/components/series/EpisodeStrip";
import ExpandableText from "@/components/series/ExpandableText";
import PlaceholderArt from "@/components/series/PlaceholderArt";
import SeriesRail from "@/components/series/SeriesRail";
import { seriesAccentStyle } from "@/lib/series-accent";
import { getPublicSeriesTitle, getSeriesPage } from "@/lib/series-page";
import { knownSeriesTags } from "@/lib/series-tags";

/*
 * The series page. Phone, top to bottom: an edge-to-edge cover that fades
 * into the page, an info card overlapping it (title, author, genre, rating,
 * episodes/time/status, the main button and Follow, the description, the AI
 * banner on its bottom edge), the episode strip, then the rails. Desktop: the
 * cover and the info card side by side, the same sections below. The series
 * color drives the main button, genre chip, stars and season pill
 * (lib/series-accent.ts keeps them readable in both themes).
 */

function formatMinutes(total: number) {
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

/** The tab title is the series title (published series only, so a draft's title never leaks). */
export async function generateMetadata({ params }: { params: { seriesId: string } }) {
  const title = await getPublicSeriesTitle(params.seriesId).catch(() => null);
  return title ? { title } : {};
}

export default async function SeriesPage({ params }: { params: { seriesId: string } }) {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const page = await getSeriesPage(params.seriesId, viewerId);
  if (!page) notFound();

  const { series, rating, episodes, seasons, totalMinutes, resume, rails } = page;
  const first = episodes[0] ?? null;
  const main = resume
    ? {
        href: `/episode/${resume.episodeId}`,
        label: resume.kind === "again" ? "Read again" : `Continue episode ${resume.episodeNumber}`,
      }
    : first
      ? { href: `/episode/${first.id}`, label: "Start reading" }
      : null;
  const signInHref = `/sign-up?callbackUrl=${encodeURIComponent(`/series/${series.id}`)}`;
  const authorName = series.author.name || "Anonymous Author";
  const tags = knownSeriesTags(series.tags);

  const cover = (eager: boolean, className: string) => (
    <CoverImage
      sources={[series.coverImage]}
      alt=""
      eager={eager}
      className={className}
      fallback={<PlaceholderArt themeColor={series.themeColor} number={1} title={series.title} size="hero" />}
    />
  );

  return (
    <main className="series-accent bg-[var(--paper-bg)] pb-16" style={seriesAccentStyle(series.themeColor)}>
      {/* Phones and tablets: the cover runs edge to edge and fades into the page. */}
      <div className="relative h-[min(68vh,520px)] w-full overflow-hidden lg:hidden">
        {cover(true, "absolute inset-0 h-full w-full object-cover")}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent via-[color-mix(in_srgb,var(--paper-bg)_55%,transparent)] to-[var(--paper-bg)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 lg:grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start lg:gap-10 lg:px-8 lg:pt-10">
        {/* Desktop: the cover as a poster beside the info card. */}
        <div className="relative hidden aspect-[2/3] overflow-hidden rounded-[28px] border border-[var(--border-color)] shadow-[var(--shadow-card)] lg:block">
          {cover(true, "absolute inset-0 h-full w-full object-cover")}
        </div>

        <div className="-mt-28 lg:mt-0">
          <section
            aria-labelledby="series-title"
            className="relative rounded-[28px] border border-[var(--border-color)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-raised)] sm:p-7"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="inline-flex rounded-full bg-[var(--sa)] px-3 py-1 font-mono-df text-[0.67rem] font-bold uppercase tracking-[0.22em] text-[var(--sa-ink)]">
                {series.genre || "Serialized fiction"}
              </span>
              {rating ? (
                <span className="theme-meta flex items-center gap-1.5 text-sm">
                  <span className="sr-only">{rating.label}</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" style={{ color: "var(--star-fill)" }} fill="currentColor">
                    <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z" />
                  </svg>
                  <span aria-hidden>
                    <span className="font-semibold text-[var(--text-primary)]">{rating.value}</span> ({rating.count.toLocaleString()}{" "}
                    {rating.count === 1 ? "rating" : "ratings"})
                  </span>
                </span>
              ) : null}
            </div>

            <h1 id="series-title" className="editorial-title theme-heading mt-3 text-balance text-4xl font-semibold leading-[1.05] md:text-5xl">
              {series.title}
            </h1>

            <p className="theme-meta mt-3 flex items-center gap-2 text-sm md:text-base">
              <FramedAvatar user={series.author} size="sm" />
              <span>
                by{" "}
                <Link
                  href={`/author/${series.authorId}`}
                  className="font-semibold text-[var(--text-primary)] underline decoration-1 underline-offset-4 transition hover:decoration-2 focus-visible:decoration-2"
                >
                  {authorName}
                </Link>
              </span>
            </p>

            <p className="theme-meta mt-3 text-sm">
              {episodes.length} {episodes.length === 1 ? "episode" : "episodes"}
              {totalMinutes > 0 ? <> · {formatMinutes(totalMinutes)}</> : null} · {series.isComplete ? "Complete" : "Ongoing"}
            </p>

            {tags.length ? (
              <ul aria-label="Tags" className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li key={tag} className="rounded-full border border-[var(--border-strong)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-5 flex items-center gap-3">
              {main ? (
                <Link
                  href={main.href}
                  className="inline-flex min-h-12 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-full bg-[var(--sa)] px-5 text-base font-semibold text-[var(--sa-ink)] shadow-[0_0_0_1px_var(--border-strong),0_10px_26px_color-mix(in_srgb,var(--sa)_30%,transparent)] transition hover:brightness-110 sm:flex-none"
                >
                  {main.label}
                </Link>
              ) : (
                <p className="theme-meta text-sm">The first episode is coming soon.</p>
              )}
              <FollowSeriesButton
                seriesId={series.id}
                seriesTitle={series.title}
                initialFollowing={page.following}
                initialCount={series.followers}
                signedIn={Boolean(viewerId)}
                variant="secondary"
              />
            </div>
            {!viewerId && main ? (
              <p className="mt-3 text-sm">
                <Link href={signInHref} className="font-semibold text-[var(--text-primary)] underline decoration-1 underline-offset-4 hover:decoration-2">
                  Create a free account to save progress
                </Link>
              </p>
            ) : null}

            <ExpandableText text={series.description} className="theme-body mt-5 text-base leading-7" />
          </section>
          {/* The AI-use banner hangs from the card's bottom edge; reports go to Administration › Reports. */}
          <div className="flex items-start justify-between gap-3 pr-2">
            <AiTagBanner tag={series.aiUsageTag} className="ml-6 -mt-px" />
            <ReportAiTagButton target={{ seriesId: series.id }} currentTag={series.aiUsageTag} subject={series.title} underline />
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl space-y-10 px-4 lg:px-8">
        <EpisodeStrip
          seriesId={series.id}
          seriesTitle={series.title}
          seriesCover={series.coverImage}
          themeColor={series.themeColor}
          episodes={episodes}
          seasons={seasons}
          resumeEpisodeId={resume && resume.kind !== "again" ? resume.episodeId : null}
          signedIn={Boolean(viewerId)}
        />

        {/* Row 1 (same genre, else "Like this one", else "More for you") and Row 2 (the author); empty rows hide. */}
        {rails.primary ? (
          <SeriesRail
            title={rails.primary.title}
            cards={rails.primary.cards}
            seeAllHref={rails.primary.kind === "genre" ? `/explore?genre=${encodeURIComponent(series.genre)}` : undefined}
          />
        ) : null}
        <SeriesRail title={`More by ${authorName}`} cards={rails.byAuthor} seeAllHref={`/author/${series.authorId}`} />
      </div>
    </main>
  );
}
