import Link from "next/link";

export type CoverSeries = {
  id: string;
  title: string;
  coverImage?: string | null;
  genre?: string | null;
  themeColor?: string | null;
  authorName?: string | null;
  reads?: number;
};

export default function CoverSeriesCard({
  series,
  rank,
  variant = "poster",
  className = "",
}: {
  series: CoverSeries;
  rank?: number;
  variant?: "poster" | "wide";
  className?: string;
}) {
  const accent = series.themeColor || "#7c3aed";
  const isWide = variant === "wide";

  return (
    <Link
      href={`/series/${series.id}`}
      className={`group block ${className}`.trim()}
      style={
        isWide
          ? { width: 240, flexShrink: 0 }
          : { width: "100%", maxWidth: 320 }
      }
    >
      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          aspectRatio: isWide ? "1.6" : "0.75",
          background: `linear-gradient(160deg, #0a0a0a 0%, ${accent}55 100%)`,
        }}
      >
        {series.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={series.coverImage}
            alt={series.title}
            className={`h-full w-full object-cover transition-all duration-700 ${
              variant === "poster"
                ? "brightness-75 blur-[6px] group-hover:blur-0 group-hover:brightness-90"
                : "group-hover:brightness-110"
            }`}
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `linear-gradient(160deg, #0a0a0a 0%, ${accent}55 100%)` }}
          />
        )}

        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${accent}99 0%, rgba(0,0,0,0.18) 48%, transparent 72%)`,
          }}
        />

        {rank ? (
          <span className="absolute right-3 top-2 z-10 font-heading text-[2.75rem] font-bold leading-none text-white/90 drop-shadow-lg">
            {rank}
          </span>
        ) : null}

        {series.genre ? (
          <span
            className="absolute left-3 top-3 font-mono-df text-[10px] uppercase tracking-widest rounded px-2 py-1"
            style={{
              backgroundColor: `${accent}30`,
              color: variant === "poster" ? accent : "#fff",
              border: `1px solid ${accent}40`,
            }}
          >
            {series.genre}
          </span>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-heading text-xl leading-tight text-white drop-shadow-lg line-clamp-2">
            {series.title}
          </h3>
          {series.authorName ? (
            <p className="mt-1 font-mono-df text-[10px] tracking-wide text-white/55">
              by {series.authorName}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
