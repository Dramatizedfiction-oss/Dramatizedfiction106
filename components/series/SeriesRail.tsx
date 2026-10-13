import Link from "next/link";
import AiTagBanner from "@/components/AiTagBanner";
import CoverImage from "@/components/series/CoverImage";
import PlaceholderArt from "@/components/series/PlaceholderArt";
import { coverThumbUrl } from "@/lib/cover-thumbs";
import type { RailCard } from "@/lib/series-page";

/**
 * One horizontal rail of portrait series cards (title, author, rating, the
 * mini AI-tag banner). Cards use each cover's 480px small copy. Renders
 * nothing when there are no cards.
 */
export default function SeriesRail({ title, cards, seeAllHref }: { title: string; cards: RailCard[]; seeAllHref?: string }) {
  if (cards.length === 0) return null;
  const id = `rail-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={id}>
      <div className="flex items-center gap-3">
        <h2 id={id} className="font-heading theme-heading min-w-0 truncate text-xl font-semibold">
          {title}
        </h2>
        {seeAllHref ? (
          <Link
            href={seeAllHref}
            className="ml-auto inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-[var(--text-primary)] underline decoration-1 underline-offset-4 hover:decoration-2"
          >
            See all
          </Link>
        ) : null}
      </div>
      <ul className="scrollbar-hide -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 lg:mx-0 lg:scroll-px-0 lg:px-0">
        {cards.map((card, index) => (
          <li key={card.id} className="w-[38%] max-w-[170px] shrink-0 snap-start sm:w-[150px]">
            <Link href={`/series/${card.id}`} className="group block">
              <div className="flex flex-col items-center">
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]">
                  <CoverImage
                    sources={[coverThumbUrl(card.coverImage), card.coverImage]}
                    className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02] motion-reduce:transition-none"
                    fallback={<PlaceholderArt themeColor={card.themeColor} number={index + 1} title={card.title} size="rail" />}
                  />
                </div>
                <AiTagBanner tag={card.aiUsageTag} className="-mt-px" />
              </div>
              <p className="theme-heading mt-2 line-clamp-2 text-sm font-semibold leading-snug">{card.title}</p>
              <p className="theme-meta mt-0.5 truncate text-xs">{card.authorName || "Anonymous Author"}</p>
              {card.rating ? (
                <p className="theme-meta mt-0.5 flex items-center gap-1 text-xs">
                  <span className="sr-only">{card.rating.label}</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[var(--status-warning)]" fill="currentColor">
                    <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z" />
                  </svg>
                  <span aria-hidden>
                    {card.rating.value} ({card.rating.count.toLocaleString()})
                  </span>
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
