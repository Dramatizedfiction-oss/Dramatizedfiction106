import Link from "next/link";
import type { ReactNode } from "react";
import AiTagBanner from "@/components/AiTagBanner";
import CoverImage from "@/components/series/CoverImage";
import PlaceholderArt from "@/components/series/PlaceholderArt";
import LinkIcon from "@/components/author-profile/LinkIcon";
import OwnerPrompt from "@/components/author-profile/OwnerPrompt";
import SwipeRow from "@/components/author-profile/SwipeRow";
import {
  ON_SITE_PREVIEW,
  linkDomain,
  linkIcon,
  sectionVisible,
  type AboutCardData,
  type LibraryCardData,
  type LinkData,
  type OnSiteData,
  type SectionSwitches,
} from "@/lib/author-profile-rules";
import { coverThumbUrl } from "@/lib/cover-thumbs";
import { safeProfileLink } from "@/lib/profile";

/*
 * The five sections of a writer's Writing view, in order: Bio, Library,
 * Author area, On site, Links. Rendered by the author page (server) and by the
 * editor's visitor preview (client), so it holds no data fetching.
 *
 *   visitor: a section appears only when its switch is on and it has content;
 *            otherwise nothing renders (no heading, no box).
 *   owner:   empty sections show a faint prompt that opens the editor; a
 *            section switched off stays visible to the owner, faded and
 *            labelled "Hidden from visitors".
 */

export type WritingSectionsProps = {
  mode: "owner" | "visitor";
  authorId: string;
  bio: string | null;
  sections: SectionSwitches;
  library: LibraryCardData[];
  about: AboutCardData[];
  links: LinkData[];
  onSite: OnSiteData;
};

export default function WritingSections({ mode, authorId, bio, sections, library, about, links, onSite }: WritingSectionsProps) {
  const owner = mode === "owner";
  // Visitors never see unpublished series cards, whatever they were given.
  const libraryCards = owner ? library : library.filter((card) => card.kind === "BOOK" || card.series.published);
  const bioText = bio?.trim() ?? "";
  const onSiteCount = onSite.series.length + onSite.episodes.length;

  const show = (on: boolean, count: number) => (owner ? true : sectionVisible(on, count));

  return (
    <div className="space-y-10">
      {show(sections.bio, bioText ? 1 : 0) ? (
        <Section id="bio" title="Bio" visuallyHiddenTitle owner={owner} hidden={!sections.bio && bioText !== ""}>
          {bioText ? (
            <p className="theme-body max-w-3xl whitespace-pre-line break-words text-base leading-7 md:text-lg">{bioText}</p>
          ) : (
            <OwnerPrompt tab="basics">Add your bio</OwnerPrompt>
          )}
        </Section>
      ) : null}

      {show(sections.library, libraryCards.length) ? (
        <Section id="library" title="Library" owner={owner} hidden={!sections.library && libraryCards.length > 0}>
          {libraryCards.length ? (
            <SwipeRow label="Library">
              {libraryCards.map((card, index) => (
                <LibraryCard key={card.key} card={card} index={index} owner={owner} />
              ))}
            </SwipeRow>
          ) : (
            <OwnerPrompt tab="library">Showcase your books and series</OwnerPrompt>
          )}
        </Section>
      ) : null}

      {show(sections.about, about.length) ? (
        <Section id="about" title="About me" owner={owner} hidden={!sections.about && about.length > 0}>
          {about.length ? (
            <SwipeRow label="About me">
              {about.map((card) => (
                <li key={card.key} className="flex w-[82%] max-w-[320px] shrink-0 snap-start sm:w-[300px]">
                  <article className="flex w-full flex-col rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-[var(--shadow-card)]">
                    <h3 className="font-heading theme-heading break-words text-lg font-semibold leading-snug">{card.prompt}</h3>
                    <p className="theme-body mt-3 whitespace-pre-line break-words text-sm leading-6">{card.answer}</p>
                  </article>
                </li>
              ))}
            </SwipeRow>
          ) : (
            <OwnerPrompt tab="about">Answer a question for your readers</OwnerPrompt>
          )}
        </Section>
      ) : null}

      {show(sections.onSite, onSiteCount) && (onSiteCount > 0 || owner) ? (
        <Section id="on-site" title="On Dramatized Fiction" owner={owner} hidden={!sections.onSite && onSiteCount > 0}>
          {onSiteCount ? (
            <OnSite authorId={authorId} data={onSite} />
          ) : (
            <p className="theme-meta text-sm">Your published series and episodes will appear here automatically. Only you can see this note.</p>
          )}
        </Section>
      ) : null}

      {show(sections.links, links.length) ? (
        <Section id="links" title="Links" owner={owner} hidden={!sections.links && links.length > 0}>
          {links.length ? <LinksList links={links} /> : <OwnerPrompt tab="links">Add a link</OwnerPrompt>}
        </Section>
      ) : null}
    </div>
  );
}

function Section({
  id,
  title,
  owner,
  hidden,
  visuallyHiddenTitle = false,
  children,
}: {
  id: string;
  title: string;
  owner: boolean;
  /** Switched off but has content: shown to the owner only, faded. */
  hidden: boolean;
  visuallyHiddenTitle?: boolean;
  children: ReactNode;
}) {
  const headingId = `profile-${id}`;
  return (
    <section aria-labelledby={headingId} className={owner && hidden ? "opacity-55" : undefined}>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${visuallyHiddenTitle && !(owner && hidden) ? "sr-only" : "mb-3"}`}>
        <h2 id={headingId} className={`font-heading theme-heading text-xl font-semibold md:text-2xl ${visuallyHiddenTitle ? "sr-only" : ""}`}>
          {title}
        </h2>
        {owner && hidden ? (
          <span className="rounded-full border border-[var(--border-strong)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
            Hidden from visitors
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function LibraryCard({ card, index, owner }: { card: LibraryCardData; index: number; owner: boolean }) {
  const itemClass = "w-[44%] max-w-[190px] shrink-0 snap-start sm:w-[180px]";

  if (card.kind === "SERIES") {
    const { series } = card;
    return (
      <li className={itemClass}>
        <Link href={`/series/${series.id}`} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
          <div className="flex flex-col items-center">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]">
              <CoverImage
                sources={[coverThumbUrl(series.coverImage), series.coverImage]}
                className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02] motion-reduce:transition-none"
                fallback={<PlaceholderArt themeColor={series.themeColor} number={index + 1} title={series.title} size="rail" />}
              />
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                Series
              </span>
            </div>
            <AiTagBanner tag={series.aiUsageTag} className="-mt-px" />
          </div>
          <p className="theme-heading mt-2 line-clamp-2 break-words text-sm font-semibold leading-snug">{series.title}</p>
          {series.rating ? (
            <p className="theme-meta mt-0.5 flex items-center gap-1 text-xs">
              <span className="sr-only">{series.rating.label}</span>
              <StarIcon />
              <span aria-hidden>
                {series.rating.value} ({series.rating.count.toLocaleString()})
              </span>
            </p>
          ) : null}
          {owner && !series.published ? (
            <p className="mt-1 text-xs font-semibold text-[var(--status-warning)]">Unpublished · hidden from visitors</p>
          ) : null}
        </Link>
      </li>
    );
  }

  const href = safeProfileLink(card.url);
  const domain = linkDomain(card.url);
  const body = (
    <>
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]">
        <CoverImage
          sources={[card.coverImage]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02] motion-reduce:transition-none"
          fallback={<PlaceholderArt themeColor={null} number={index + 1} title={card.title} size="rail" />}
        />
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
          Book
        </span>
      </div>
      <p className="theme-heading mt-2 line-clamp-2 break-words text-sm font-semibold leading-snug">{card.title}</p>
      {card.note ? <p className="theme-meta mt-1 line-clamp-3 break-words text-xs leading-5">{card.note}</p> : null}
      {href && domain ? (
        <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
          <LinkIcon icon={linkIcon(href)} className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate underline decoration-1 underline-offset-2">{domain}</span>
          <span aria-hidden>↗</span>
        </p>
      ) : null}
    </>
  );

  return (
    <li className={itemClass}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          aria-label={`${card.title}${domain ? ` (opens ${domain} in a new tab)` : ""}`}
          className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          {body}
        </a>
      ) : (
        <div>{body}</div>
      )}
    </li>
  );
}

function OnSite({ authorId, data }: { authorId: string; data: OnSiteData }) {
  return (
    <div className="space-y-6">
      {data.series.length ? (
        <div>
          <SubHeading title="Series" href={data.seriesTotal > ON_SITE_PREVIEW ? `/author/${authorId}/works?tab=series` : undefined} total={data.seriesTotal} />
          <ul className="grid grid-cols-3 gap-3 sm:max-w-[600px]">
            {data.series.map((series, index) => (
              <li key={series.id} className="min-w-0">
                <Link href={`/series/${series.id}`} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
                  <div className="flex flex-col items-center">
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]">
                      <CoverImage
                        sources={[coverThumbUrl(series.coverImage), series.coverImage]}
                        className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02] motion-reduce:transition-none"
                        fallback={<PlaceholderArt themeColor={series.themeColor} number={index + 1} title={series.title} size="rail" />}
                      />
                    </div>
                    <AiTagBanner tag={series.aiUsageTag} className="-mt-px" />
                  </div>
                  <p className="theme-heading mt-2 line-clamp-2 break-words text-sm font-semibold leading-snug">{series.title}</p>
                  <p className="theme-meta mt-0.5 text-xs">
                    {series.episodeCount} episode{series.episodeCount === 1 ? "" : "s"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.episodes.length ? (
        <div>
          <SubHeading title="Latest episodes" href={data.episodesTotal > ON_SITE_PREVIEW ? `/author/${authorId}/works?tab=episodes` : undefined} total={data.episodesTotal} />
          <ul className="grid gap-3 md:grid-cols-2">
            {data.episodes.map((episode) => (
              <li key={episode.id} className="min-w-0">
                <EpisodeRow episode={episode} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function EpisodeRow({ episode }: { episode: OnSiteData["episodes"][number] }) {
  return (
    <Link
      href={`/episode/${episode.id}`}
      className="theme-panel-hover flex min-h-[84px] items-center gap-3 rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
    >
      <div className="relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]">
        <CoverImage
          sources={[coverThumbUrl(episode.coverImage), episode.coverImage]}
          className="absolute inset-0 h-full w-full object-cover"
          fallback={<PlaceholderArt themeColor={null} number={episode.episodeNumber} title="" size="rail" />}
        />
      </div>
      <span className="min-w-0">
        <span className="theme-meta block truncate text-xs">
          {episode.seriesTitle} · Episode {episode.episodeNumber}
        </span>
        <span className="theme-heading mt-0.5 block truncate font-medium">{episode.title}</span>
        <span className="mt-1 block">
          <AiTagBanner tag={episode.aiUsageTag} />
        </span>
      </span>
    </Link>
  );
}

function SubHeading({ title, href, total }: { title: string; href?: string; total: number }) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <h3 className="theme-heading text-sm font-semibold uppercase tracking-[0.14em]">{title}</h3>
      {href ? (
        <Link
          href={href}
          className="ml-auto inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-[var(--text-primary)] underline decoration-1 underline-offset-4 hover:decoration-2"
        >
          See all {total}
        </Link>
      ) : null}
    </div>
  );
}

function LinksList({ links }: { links: LinkData[] }) {
  return (
    <ul className="max-w-xl space-y-4">
      {links.map((link) => {
        const href = safeProfileLink(link.url);
        const domain = linkDomain(link.url);
        if (!href) return null;
        return (
          <li key={link.key}>
            {link.subtext ? <p className="theme-meta mb-1.5 break-words px-1 text-sm">{link.subtext}</p> : null}
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="theme-panel-hover flex min-h-14 items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--text-primary)]">
                <LinkIcon icon={linkIcon(href)} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="theme-heading block truncate text-sm font-semibold">{link.label}</span>
                <span className="theme-meta block truncate text-xs">{domain}</span>
              </span>
              <span aria-hidden className="text-[var(--text-muted)]">
                ↗
              </span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function StarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[var(--status-warning)]" fill="currentColor">
      <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z" />
    </svg>
  );
}
