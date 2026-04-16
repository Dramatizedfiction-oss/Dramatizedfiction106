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
      className="glass-panel block overflow-hidden rounded-[24px] border p-3 transition hover:border-white/20 hover:bg-white/[0.06]"
    >
      <div className="aspect-[3/4] rounded-[18px] bg-white/[0.04]">
        {series.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={series.coverImage}
            alt={series.title}
            className="h-full w-full rounded-[18px] object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-[18px] text-center text-xs uppercase tracking-[0.32em] text-white/35">
            No Cover Yet
          </div>
        )}
      </div>

      <div className="px-1 pb-1 pt-4">
        <h2 className="font-heading text-2xl font-semibold text-white">{series.title}</h2>
        <p className="mt-2 line-clamp-3 text-sm text-slate-400">
          {series.description || "No description yet."}
        </p>
      </div>
    </Link>
  );
}
