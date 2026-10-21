/*
 * Sub tags (Sweep A): up to 3 per series, chosen by the writer from this fixed
 * list in the Studio series editor and stored in Series.tags. A fixed list
 * means writers use the same words (so tags work for matching in the
 * "Like this one" / "More for you" rows) and nothing user-typed is published.
 * Edit the list here; stored values not in the list are ignored when shown or
 * ranked, and dropped the next time the series is saved. Client-safe.
 */

export const MAX_SERIES_TAGS = 3;

export const SERIES_TAGS = [
  "Slow burn",
  "Found family",
  "Enemies to lovers",
  "Second chance",
  "Coming of age",
  "Small town",
  "Sea & coast",
  "Space",
  "Royalty & court",
  "Heist",
  "Whodunit",
  "Detective",
  "Survival",
  "Time travel",
  "Dystopian",
  "Paranormal",
  "Ghosts",
  "Gothic",
  "Folk horror",
  "Cosy",
  "Dark academia",
  "Mythology",
  "Revenge",
  "Redemption",
  "Workplace",
  "Road trip",
  "Epistolary",
  "Dual timeline",
  "Post-apocalyptic",
  "Psychological",
  "Romantic comedy",
  "Political intrigue",
  "Magic",
  "Monsters",
  "Military",
  "Sports",
  // Sweep C: for the feed's Young Adult and Dark Fantasy shelves.
  "Young adult",
  "Dark fantasy",
] as const;

export type SeriesTag = (typeof SERIES_TAGS)[number];

const KNOWN = new Map(SERIES_TAGS.map((tag) => [tag.toLowerCase(), tag]));

/** The listed tags among stored values, in their canonical spelling, de-duplicated, at most 3. */
export function knownSeriesTags(values: readonly string[] | null | undefined): SeriesTag[] {
  const result: SeriesTag[] = [];
  for (const value of values ?? []) {
    const tag = KNOWN.get(value.trim().toLowerCase());
    if (tag && !result.includes(tag)) result.push(tag);
    if (result.length === MAX_SERIES_TAGS) break;
  }
  return result;
}

/** Server check for a save: every value must be on the list, at most 3, no repeats. */
export function parseSeriesTags(value: unknown): { ok: true; tags: SeriesTag[] } | { ok: false; message: string } {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return { ok: false, message: "Tags must be a list." };
  }
  if (value.length > MAX_SERIES_TAGS) return { ok: false, message: `Choose up to ${MAX_SERIES_TAGS} tags.` };
  const tags = knownSeriesTags(value);
  if (tags.length !== value.length) return { ok: false, message: "Choose tags from the list." };
  return { ok: true, tags };
}
