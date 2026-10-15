/*
 * Which recommendation rows the series page shows (Sweep A). Client-safe and
 * pure; the data comes from getSeriesRows in lib/series-page.ts.
 *   Row 1: "More in {genre}"; if empty, "Like this one" (shared sub tags);
 *          if empty, "More for you" (the member's signals, or popular series).
 *   Row 2: "More by {author}".
 * A row with nothing in it is not shown.
 */

export type RowKind = "genre" | "like" | "forYou";

export function primaryRow<T>(candidates: Record<RowKind, T[]>, genre: string): { kind: RowKind; title: string; cards: T[] } | null {
  const genreLabel = genre ? genre.charAt(0).toUpperCase() + genre.slice(1) : "this genre";
  const order: { kind: RowKind; title: string }[] = [
    { kind: "genre", title: `More in ${genreLabel}` },
    { kind: "like", title: "Like this one" },
    { kind: "forYou", title: "More for you" },
  ];
  for (const row of order) {
    if (candidates[row.kind].length > 0) return { ...row, cards: candidates[row.kind] };
  }
  return null;
}
