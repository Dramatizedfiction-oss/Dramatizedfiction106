import { MAX_SHELF_ITEMS, MAX_SHELF_WEIGHT, MAX_STAFF_PICKS, type FeedRule } from "@/lib/feed/config";
import { GENRES } from "@/lib/genres";
import { SERIES_TAGS } from "@/lib/series-tags";

/*
 * Server checks for Administration > Feed edits (Sweep C). Pure and
 * client-safe, so the editor can show the same limits.
 */

export const SHELF_NAME_MAX = 60;
/** A shelf's tag filter matches any of up to this many tags. */
export const MAX_FILTER_TAGS = 6;
/** Rules whose genre/tag filter an admin may change. */
export const FILTERABLE_RULES: readonly FeedRule[] = ["TAGS", "TRENDING_GENRE"];
export const SERIES_MODERATION = ["VISIBLE", "IN_REVIEW", "HELD", "BLOCKED"] as const;
export type SeriesModerationValue = (typeof SERIES_MODERATION)[number];

export type ShelfEdit = {
  name?: string;
  weight?: number;
  minItems?: number;
  maxItems?: number;
  enabled?: boolean;
  months?: number[];
  genres?: string[];
  tags?: string[];
};

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export function checkShelfEdit(input: ShelfEdit, current: { rule: string; minItems: number; maxItems: number }): Result<ShelfEdit> {
  const out: ShelfEdit = {};
  if (input.name !== undefined) {
    const name = input.name.replace(/\s+/g, " ").trim();
    if (name.length < 2 || name.length > SHELF_NAME_MAX) return { ok: false, message: `Names are 2-${SHELF_NAME_MAX} characters.` };
    out.name = name;
  }
  if (input.weight !== undefined) {
    if (!Number.isFinite(input.weight) || input.weight < 0 || input.weight > MAX_SHELF_WEIGHT) {
      return { ok: false, message: `Weight is a number from 0 to ${MAX_SHELF_WEIGHT}.` };
    }
    out.weight = Math.round(input.weight * 10) / 10;
  }
  const minItems = input.minItems ?? current.minItems;
  const maxItems = input.maxItems ?? current.maxItems;
  const intIn = (value: number, low: number, high: number) => Number.isInteger(value) && value >= low && value <= high;
  if (!intIn(minItems, 1, MAX_SHELF_ITEMS) || !intIn(maxItems, 1, MAX_SHELF_ITEMS)) {
    return { ok: false, message: `Minimum and maximum are whole numbers from 1 to ${MAX_SHELF_ITEMS}.` };
  }
  if (minItems > maxItems) return { ok: false, message: "The minimum can't be more than the maximum." };
  if (input.minItems !== undefined) out.minItems = minItems;
  if (input.maxItems !== undefined) out.maxItems = maxItems;
  if (input.enabled !== undefined) out.enabled = input.enabled;
  if (input.months !== undefined) {
    const months = [...new Set(input.months)].sort((a, b) => a - b);
    if (!months.every((month) => intIn(month, 1, 12))) return { ok: false, message: "Months are 1-12." };
    out.months = months;
  }
  if (input.genres !== undefined || input.tags !== undefined) {
    if (!FILTERABLE_RULES.includes(current.rule as FeedRule)) return { ok: false, message: "This shelf's rule has no genre or tag filter." };
    const filter = checkFilter(input.genres ?? [], input.tags ?? []);
    if (!filter.ok) return filter;
    if (input.genres !== undefined) out.genres = filter.value.genres;
    if (input.tags !== undefined) out.tags = filter.value.tags;
  }
  return { ok: true, value: out };
}

/** Genres from lib/genres.ts and tags from the fixed list only (never free text). */
export function checkFilter(genres: string[], tags: string[]): Result<{ genres: string[]; tags: string[] }> {
  const cleanGenres = [...new Set(genres.map((genre) => genre.trim().toLowerCase()))];
  if (!cleanGenres.every((genre) => (GENRES as readonly string[]).includes(genre))) return { ok: false, message: "Choose genres from the list." };
  const cleanTags = [...new Set(tags.map((tag) => tag.trim().toLowerCase()))];
  // Canonical spelling from the fixed list; a shelf may match any of up to MAX_FILTER_TAGS.
  const canonical = cleanTags.map((tag) => SERIES_TAGS.find((item) => item.toLowerCase() === tag));
  if (canonical.some((tag) => !tag)) return { ok: false, message: "Choose tags from the list." };
  if (canonical.length > MAX_FILTER_TAGS) return { ok: false, message: `Up to ${MAX_FILTER_TAGS} tags.` };
  return { ok: true, value: { genres: cleanGenres, tags: canonical as string[] } };
}

/** A new admin shelf: a tag shelf (optionally limited to genres, optionally seasonal). */
export function checkNewTagShelf(input: { name: string; genres: string[]; tags: string[]; months: number[]; weight: number }) {
  const filter = checkFilter(input.genres, input.tags);
  if (!filter.ok) return filter;
  if (filter.value.tags.length === 0) return { ok: false as const, message: "Choose at least one tag." };
  const rest = checkShelfEdit({ name: input.name, weight: input.weight, months: input.months }, { rule: "TAGS", minItems: 4, maxItems: 12 });
  if (!rest.ok) return rest;
  return { ok: true as const, value: { ...rest.value, ...filter.value } };
}

export function checkStaffPicks(seriesIds: string[]): Result<string[]> {
  const unique = [...new Set(seriesIds)];
  if (unique.length !== seriesIds.length) return { ok: false, message: "A series can be picked once." };
  if (unique.length > MAX_STAFF_PICKS) return { ok: false, message: `Up to ${MAX_STAFF_PICKS} picks.` };
  return { ok: true, value: unique };
}

/** A URL-safe key for an admin shelf, unique enough with a short suffix. */
export function shelfKey(name: string, suffix: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "shelf";
  return `${base}-${suffix}`;
}
