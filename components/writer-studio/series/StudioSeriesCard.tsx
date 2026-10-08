import Link from "next/link";
import { formatRelative, plural, safeHexColor, safeImageUrl } from "@/lib/writer-studio/format";
import type { StudioSeriesSummary } from "@/lib/writer-studio/queries";

export default function StudioSeriesCard({ series }: { series: StudioSeriesSummary }) {
  const accent = safeHexColor(series.themeColor);
  const cover = safeImageUrl(series.coverImage);
  const live = series.status === "PUBLISHED";

  return (
    <Link
      href={`/writer-studio/series/${series.id}`}
      className="group flex overflow-hidden rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-surface)] transition hover:border-[var(--studio-muted)]"
    >
      <div
        className="relative w-24 shrink-0 sm:w-28"
        style={{ background: `linear-gradient(160deg, ${accent}, ${accent}33)` }}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="theme-heading truncate font-heading text-lg font-semibold">{series.title}</p>
          <span className={`studio-status shrink-0 ${live ? "studio-status-live" : "studio-status-draft"}`}>
            {live ? "Live" : "Draft"}
          </span>
        </div>
        <p className="mt-1 text-xs capitalize text-[var(--studio-muted)]">{series.genre}</p>
        <p className="mt-3 text-xs text-[var(--studio-muted)]">
          {plural(series.episodeCount, "episode")}
          {series.draftCount > 0 ? ` · ${plural(series.draftCount, "draft")}` : ""}
          {" · "}updated {formatRelative(series.lastActivity)}
        </p>
      </div>
    </Link>
  );
}
