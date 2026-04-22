import Link from "next/link";

type SeriesCardProps = {
  series: {
    id: string;
    title: string;
    description?: string | null;
    coverImage?: string | null;
  };
};

export default function SeriesCard({ series }: SeriesCardProps) {
  return (
    <Link
      href={`/series/${series.id}`}
      className="glass-panel theme-panel-hover block overflow-hidden rounded-[24px] border border-[var(--border-color)] p-3 transition hover:opacity-80"
    >
      <div className="theme-panel aspect-[3/4] rounded-[18px] border">
        {series.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={series.coverImage}
            alt={series.title}
            className="h-full w-full rounded-[18px] object-cover"
          />
        ) : (
          <div className="theme-meta flex h-full items-center justify-center rounded-[18px] text-center text-xs uppercase tracking-[0.32em]">
            No Cover Yet
          </div>
        )}
      </div>

      <div className="px-1 pb-1 pt-4">
        <h2 className="font-heading theme-heading text-2xl font-semibold">{series.title}</h2>
        <p className="theme-meta mt-2 line-clamp-3 text-sm">
          {series.description || "No description yet."}
        </p>
      </div>
    </Link>
  );
}
