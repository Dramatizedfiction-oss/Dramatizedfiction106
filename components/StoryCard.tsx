import Link from "next/link";
import AiUsageBadge from "@/components/AiUsageBadge";
import AuthorTierBadge from "@/components/AuthorTierBadge";
import ContentAccessBadge from "@/components/monetization/ContentAccessBadge";
import ReportAiTagButton from "@/components/ReportAiTagButton";
import type { AuthorVisibilityTier } from "@/lib/author-tier";
import {
  canUserAccessContent,
  type MonetizedSeries,
  type MonetizedUser,
} from "@/lib/monetization";

type StoryCardProps = {
  story: {
    id: string;
    title?: string | null;
    description?: string | null;
    previewText?: string | null;
    coverImage?: string | null;
    author?: {
      name?: string | null;
      tier?: AuthorVisibilityTier | null;
    } | null;
    tags?: string[] | null;
    aiUsageTag?: string | null;
    engagementLabel?: string | null;
    monetization?: Partial<MonetizedSeries>;
  };
  href?: string;
  className?: string;
  viewer?: MonetizedUser | null;
};

function getPreviewText(story: StoryCardProps["story"]) {
  const preview = story.previewText?.trim();
  if (preview) {
    return preview;
  }

  const description = story.description?.trim();
  if (description) {
    return description;
  }

  return "A new dramatized fiction world is taking shape here.";
}

export default function StoryCard({
  story,
  href,
  className = "",
  viewer = null,
}: StoryCardProps) {
  const title = story.title?.trim() || "Untitled Story";
  const authorName = story.author?.name?.trim() || "Anonymous Author";
  const preview = getPreviewText(story);
  const tags = (story.tags || []).filter(Boolean).slice(0, 3);
  const monetizedContent: MonetizedSeries = {
    contentType: "series",
    id: story.id,
    isFree: story.monetization?.isFree ?? true,
    isLocked: story.monetization?.isLocked ?? false,
    price: story.monetization?.price ?? null,
    creatorId: story.monetization?.creatorId ?? "",
  };
  const accessStatus = canUserAccessContent(viewer, monetizedContent).accessStatus;
  const locked = accessStatus === "locked";

  return (
    <Link
      href={href || `/series/${story.id}`}
      className={`glass-panel block h-full overflow-hidden rounded-[24px] border border-[var(--border-color)] p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:opacity-95 ${className}`.trim()}
    >
      <div className="theme-panel relative aspect-[4/5] rounded-[18px] border border-[var(--border-color)]">
        {story.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.coverImage}
            alt={title}
            className={`h-full w-full rounded-[18px] object-cover ${locked ? "blur-[2px] opacity-70" : ""}`}
          />
        ) : (
          <div className="theme-meta flex h-full items-center justify-center rounded-[18px] px-4 text-center text-xs uppercase tracking-[0.32em]">
            Story Cover
          </div>
        )}

        {locked && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[18px] bg-black/20">
            <span className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white">
              Locked Preview
            </span>
          </div>
        )}
      </div>

      <div className="px-1 pb-1 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">By {authorName}</p>
            {story.author?.tier ? <AuthorTierBadge tier={story.author.tier} compact /> : null}
          </div>
          <div className="flex items-center gap-2">
            <ContentAccessBadge accessStatus={accessStatus} />
            <AiUsageBadge tag={story.aiUsageTag} compact />
          </div>
        </div>
        <h2 className="font-heading theme-heading mt-2 text-xl font-semibold md:text-2xl">
          {title}
        </h2>
        {story.engagementLabel ? (
          <p className="theme-meta mt-2 text-xs uppercase tracking-[0.24em]">
            {story.engagementLabel}
          </p>
        ) : null}
        <p className="theme-body mt-3 line-clamp-3 text-sm leading-6">
          {preview}
        </p>

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {locked && (
          <p className="theme-meta mt-4 text-xs uppercase tracking-[0.2em]">
            Teaser only | {monetizedContent.price !== null ? `$${monetizedContent.price.toFixed(2)}` : "Premium"}
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <ReportAiTagButton subject={title} compact />
        </div>
      </div>
    </Link>
  );
}
