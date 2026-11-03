"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reorderSeasons } from "@/lib/writer-studio/api";
import SeasonSheet, { type SeasonSheetSeason } from "./SeasonSheet";

/*
 * A season's controls on the Studio series page (Sweep G): move it earlier
 * or later (▲/▼) and Edit (title, description, status, delete). Reordering
 * renumbers every season and episode, so when readers can see the series it
 * asks first.
 */
export default function SeasonControls({
  seriesId,
  seasonIds,
  season,
  seriesLive,
}: {
  seriesId: string;
  /** Every season of the series, in order. */
  seasonIds: string[];
  season: SeasonSheetSeason;
  seriesLive: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const index = seasonIds.indexOf(season.id);

  async function move(offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= seasonIds.length) return;
    if (seriesLive && !window.confirm("Readers will see the seasons and episode numbers in the new order. Move this season?")) return;
    const order = [...seasonIds];
    [order[index], order[target]] = [order[target], order[index]];
    setPending(true);
    setError(null);
    const result = await reorderSeasons(seriesId, order);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        {seasonIds.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => void move(-1)}
              disabled={pending || index === 0}
              className="studio-tool"
              aria-label={`Move Season ${season.number} earlier`}
              title="Move earlier"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => void move(1)}
              disabled={pending || index === seasonIds.length - 1}
              className="studio-tool"
              aria-label={`Move Season ${season.number} later`}
              title="Move later"
            >
              ▼
            </button>
          </>
        ) : null}
        <SeasonSheet
          seriesId={seriesId}
          season={season}
          isOnlySeason={seasonIds.length === 1}
          trigger={(open) => (
            <button type="button" onClick={open} className="studio-tool" aria-label={`Edit Season ${season.number}`}>
              Edit
            </button>
          )}
        />
      </div>
      {error ? (
        <p role="alert" className="text-xs text-[var(--status-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
