import Link from "next/link";
import { safeHexColor } from "@/lib/writer-studio/format";

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
  // Stored theme colors may be free text from older forms ("Black"); only a
  // hex value can take the alpha suffixes used below.
  const accent = safeHexColor(series.themeColor);
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
        className="relative overflow-hidden rounded-xl shadow-[var(--shadow-card)] ring-1 ring-[var(--border-color)] transition group-hover:ring-[var(--border-strong)]"
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

        {/* Cover art is its own dark world in both themes: a neutral scrim keeps the
            white title readable over any image or series color; the accent tints it. */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, rgba(8,8,14,0.88) 0%, rgba(8,8,14,0.45) 38%, transparent 66%), linear-gradient(to top, ${accent}55 0%, transparent 55%)`,
          }}
        />

        {rank ? (
          <span className="absolute right-3 top-2 z-10 font-heading text-[2.75rem] font-bold leading-none text-white/90 drop-shadow-lg">
            {rank}
          </span>
        ) : null}

        {series.genre ? (
          <span
            className="absolute left-3 top-3 rounded px-2 py-1 font-mono-df text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm"
            style={{
              backgroundColor: "rgba(8,8,14,0.55)",
              border: `1px solid ${accent}99`,
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
            <p className="mt-1 font-mono-df text-[10px] tracking-wide text-white/80">
              by {series.authorName}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
