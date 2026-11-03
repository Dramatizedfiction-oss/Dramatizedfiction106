/*
 * Seasons (Sweep G): client-safe rules. The server side (locking, renumbering
 * the rows) is lib/seasons.ts.
 *
 * Numbering: Episode.episodeNumber stays the series-wide reading order (next
 * episode, Continue and the feed use it unchanged); seasonEpisodeNumber is the
 * number within the season that readers see ("S2 E3"). Both are always
 * derived from the layout below: seasons in order, each with its episodes in
 * order, numbered 1..n without gaps. Season.number is the season's place.
 */

export const MAX_SEASONS = 20;
export const SEASON_TITLE_MAX = 60;
export const SEASON_DESCRIPTION_MAX = 300;

export type SeasonStatusValue = "ONGOING" | "COMPLETE";

/** "Season 2" or "Season 2: The Salt War". */
export function seasonLabel(season: { number: number; title?: string | null }) {
  const title = season.title?.trim();
  return title ? `Season ${season.number}: ${title}` : `Season ${season.number}`;
}

/**
 * Whether labels need the season ("S2 E3") or not ("E3"): only when readers
 * can tell seasons apart, i.e. more than one visible season, or a single
 * visible season that isn't Season 1. `seasonNumbers` are the seasons shown.
 */
export function showSeasonCodes(seasonNumbers: readonly number[]) {
  const unique = new Set(seasonNumbers);
  return unique.size > 1 || (unique.size === 1 && !unique.has(1));
}

/** "S2 E3" (or "E3" when the series reads as one season). */
export function episodeCode(episode: { seasonNumber: number; numberInSeason: number }, withSeason: boolean) {
  return withSeason ? `S${episode.seasonNumber} E${episode.numberInSeason}` : `E${episode.numberInSeason}`;
}

/** "Season 2 · Episode 3" (or "Episode 3"), for headings. */
export function episodeHeading(episode: { seasonNumber: number; numberInSeason: number }, withSeason: boolean) {
  return withSeason ? `Season ${episode.seasonNumber} · Episode ${episode.numberInSeason}` : `Episode ${episode.numberInSeason}`;
}

/**
 * An episode's label in the Writer Studio, where the writer sees every season
 * (drafts too): "S2 E3" once the series has more than one season, else the
 * plain number as before. `seasonEpisodeNumber` falls back to the overall one.
 */
export function studioEpisodeCode(
  episode: { episodeNumber: number; seasonEpisodeNumber: number | null; season: { number: number } | null },
  seasonCount: number,
) {
  const seasonNumber = episode.season?.number ?? 1;
  const numberInSeason = episode.seasonEpisodeNumber ?? episode.episodeNumber;
  return seasonCount > 1 || seasonNumber !== 1 ? episodeCode({ seasonNumber, numberInSeason }, true) : String(numberInSeason);
}

/** The same as a label in sentences and headings: "S2 E3", or "Episode 3" for a one-season series. */
export function studioEpisodeLabel(
  episode: { episodeNumber: number; seasonEpisodeNumber: number | null; season: { number: number } | null },
  seasonCount: number,
) {
  const code = studioEpisodeCode(episode, seasonCount);
  return /^\d+$/.test(code) ? `Episode ${code}` : code;
}

/** Readers see a season once it has a published episode; the rest are the writer's drafts. */
export function readerVisibleSeasons<T extends { publishedCount: number }>(seasons: readonly T[]) {
  return seasons.filter((season) => season.publishedCount > 0);
}

/**
 * The season the series page opens on: the one holding the reader's resume
 * episode, else the latest visible season. `seasons` are in order.
 */
export function openingSeason(seasons: readonly { number: number }[], resumeSeasonNumber: number | null) {
  if (resumeSeasonNumber !== null && seasons.some((season) => season.number === resumeSeasonNumber)) return resumeSeasonNumber;
  return seasons.at(-1)?.number ?? 1;
}

/** Status readers see: a complete series shows every season complete. */
export function displayedSeasonStatus(status: SeasonStatusValue, seriesComplete: boolean): SeasonStatusValue {
  return seriesComplete ? "COMPLETE" : status;
}

// ---- input --------------------------------------------------------------------

export type SeasonFields = { title: string | null; description: string | null; status?: SeasonStatusValue };

/** Server check for a season's editable fields. Blank text clears it; omitted fields stay as they are. */
export function parseSeasonFields(
  value: unknown,
): { ok: true; fields: Partial<SeasonFields> } | { ok: false; message: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, message: "Send the season's details." };
  const input = value as Record<string, unknown>;
  const fields: Partial<SeasonFields> = {};

  for (const [key, max, label] of [
    ["title", SEASON_TITLE_MAX, "Title"],
    ["description", SEASON_DESCRIPTION_MAX, "Description"],
  ] as const) {
    if (!(key in input) || input[key] === undefined) continue;
    const raw = input[key];
    if (raw !== null && typeof raw !== "string") return { ok: false, message: `${label} must be text.` };
    const text = (raw ?? "").replace(/\s+/g, " ").trim();
    if (text.length > max) return { ok: false, message: `${label} can be up to ${max} characters.` };
    fields[key] = text || null;
  }

  if ("status" in input && input.status !== undefined) {
    if (input.status !== "ONGOING" && input.status !== "COMPLETE") return { ok: false, message: "Status must be ongoing or complete." };
    fields.status = input.status;
  }
  return { ok: true, fields };
}

// ---- layout and numbering -----------------------------------------------------

/** A series' seasons in order, each with its episode ids in reading order. */
export type SeasonLayout = { id: string; episodeIds: string[] }[];

export type Numbering = {
  seasons: { id: string; number: number }[];
  episodes: { id: string; seasonId: string; episodeNumber: number; seasonEpisodeNumber: number }[];
};

/** Numbers everything from the layout: seasons 1..n, episodes 1..n overall and 1..k within each season. */
export function numberLayout(layout: SeasonLayout): Numbering {
  const episodes: Numbering["episodes"] = [];
  let overall = 0;
  for (const season of layout) {
    season.episodeIds.forEach((id, index) => {
      overall += 1;
      episodes.push({ id, seasonId: season.id, episodeNumber: overall, seasonEpisodeNumber: index + 1 });
    });
  }
  return { seasons: layout.map((season, index) => ({ id: season.id, number: index + 1 })), episodes };
}

/**
 * Moves an episode to another season. Into a later season it becomes that
 * season's first episode; into an earlier one, its last. So moving an episode
 * across the boundary next to it ("this one really opens Season 2") keeps the
 * reading order. Returns null when the episode or season isn't in the layout.
 */
export function moveEpisode(layout: SeasonLayout, episodeId: string, targetSeasonId: string): SeasonLayout | null {
  const from = layout.findIndex((season) => season.episodeIds.includes(episodeId));
  const to = layout.findIndex((season) => season.id === targetSeasonId);
  if (from < 0 || to < 0) return null;
  if (from === to) return layout;
  return layout.map((season, index) => {
    if (index === from) return { ...season, episodeIds: season.episodeIds.filter((id) => id !== episodeId) };
    if (index === to) return { ...season, episodeIds: to > from ? [episodeId, ...season.episodeIds] : [...season.episodeIds, episodeId] };
    return season;
  });
}

/** Reorders seasons; `order` must name every season exactly once. */
export function reorderSeasons(layout: SeasonLayout, order: readonly string[]): SeasonLayout | null {
  if (order.length !== layout.length || new Set(order).size !== order.length) return null;
  const byId = new Map(layout.map((season) => [season.id, season]));
  const next = order.map((id) => byId.get(id));
  return next.every(Boolean) ? (next as SeasonLayout) : null;
}

/** What the season routes say when they refuse (code + message; 404 for NOT_FOUND, 409 otherwise). */
export const SEASON_REFUSALS = {
  NOT_FOUND: "Season or episode not found.",
  LAST_SEASON: "A series always keeps at least one season.",
  NOT_EMPTY: "Move this season's episodes to another season before deleting it.",
  LIMIT: `A series can have up to ${MAX_SEASONS} seasons.`,
  BAD_ORDER: "Send every season of this series exactly once.",
} as const;

export type SeasonRefusal = keyof typeof SEASON_REFUSALS;

/** Why a season can't be deleted, or null when it can. */
export function seasonDeleteBlocker(layout: SeasonLayout, seasonId: string): "NOT_FOUND" | "LAST_SEASON" | "NOT_EMPTY" | null {
  const season = layout.find((item) => item.id === seasonId);
  if (!season) return "NOT_FOUND";
  if (layout.length === 1) return "LAST_SEASON";
  if (season.episodeIds.length > 0) return "NOT_EMPTY";
  return null;
}
