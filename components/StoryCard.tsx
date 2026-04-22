import Link from "next/link";

type StoryCardProps = {
  story: {
    id: string;
    title?: string | null;
    description?: string | null;
    previewText?: string | null;
    coverImage?: string | null;
    author?: {
      name?: string | null;
    } | null;
    tags?: string[] | null;
  };
  href?: string;
  className?: string;
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
}: StoryCardProps) {
  const title = story.title?.trim() || "Untitled Story";
  const authorName = story.author?.name?.trim() || "Anonymous Author";
  const preview = getPreviewText(story);
  const tags = (story.tags || []).filter(Boolean).slice(0, 3);

  return (
    <Link
      href={href || `/series/${story.id}`}
      className={`glass-panel block h-full overflow-hidden rounded-[24px] border border-[var(--border-color)] p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:opacity-95 ${className}`.trim()}
    >
      <div className="theme-panel aspect-[4/5] rounded-[18px] border border-[var(--border-color)]">
        {story.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.coverImage}
            alt={title}
            className="h-full w-full rounded-[18px] object-cover"
          />
        ) : (
          <div className="theme-meta flex h-full items-center justify-center rounded-[18px] px-4 text-center text-xs uppercase tracking-[0.32em]">
            Story Cover
          </div>
        )}
      </div>

      <div className="px-1 pb-1 pt-4">
        <p className="eyebrow">By {authorName}</p>
        <h2 className="font-heading theme-heading mt-2 text-xl font-semibold md:text-2xl">
          {title}
        </h2>
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
      </div>
    </Link>
  );
}
