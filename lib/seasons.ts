import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { numberLayout, type Numbering, type SeasonLayout } from "@/lib/season-rules";

/*
 * Seasons (Sweep G), server side. Every change to a series' seasons or to
 * which season an episode is in goes through a transaction that holds the
 * series' season lock, reads the layout, changes it and writes back the
 * numbering from lib/season-rules.ts (seasons 1..n, episodeNumber 1..n
 * overall, seasonEpisodeNumber 1..k per season). Raw SQL is used for the
 * renumbering, so it never touches updatedAt/lastSavedAt (renumbering isn't
 * writing).
 */

type Tx = Prisma.TransactionClient;

// Above any real number, so the first pass of a renumbering can't collide.
const PARK_OFFSET = 1_000_000;

/** For every transaction that takes the season lock: changes to one series queue on it. */
export const SEASON_TRANSACTION = { maxWait: 15_000, timeout: 20_000 } as const;

export async function lockSeriesSeasons(tx: Tx, seriesId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('df:seasons'), hashtext(${seriesId}))`;
}

/**
 * Makes sure the series has a season and every episode is in one (a safety
 * net: the migration backfilled both, and every code path sets them). An
 * episode without a season joins the latest season.
 */
export async function ensureSeasons(tx: Tx, seriesId: string) {
  let latest = await tx.season.findFirst({ where: { seriesId }, orderBy: { number: "desc" }, select: { id: true } });
  if (!latest) latest = await tx.season.create({ data: { seriesId, number: 1 }, select: { id: true } });
  const loose = await tx.episode.count({ where: { seriesId, OR: [{ seasonId: null }, { seasonEpisodeNumber: null }] } });
  if (loose > 0) {
    await tx.episode.updateMany({ where: { seriesId, seasonId: null }, data: { seasonId: latest.id } });
    await writeNumbering(tx, seriesId, numberLayout(await readLayout(tx, seriesId)));
  }
  return latest.id;
}

/** The series' seasons in order, each with its episodes in reading order. */
export async function readLayout(tx: Tx, seriesId: string): Promise<SeasonLayout> {
  const seasons = await tx.season.findMany({
    where: { seriesId },
    orderBy: { number: "asc" },
    select: { id: true, episodes: { orderBy: [{ seasonEpisodeNumber: "asc" }, { episodeNumber: "asc" }], select: { id: true } } },
  });
  return seasons.map((season) => ({ id: season.id, episodeIds: season.episodes.map((episode) => episode.id) }));
}

/** Writes a numbering for the whole series in two passes (park, then final) so unique indexes never clash. */
export async function writeNumbering(tx: Tx, seriesId: string, numbering: Numbering) {
  const seasonIds = numbering.seasons.map((season) => season.id);
  const seasonNumbers = numbering.seasons.map((season) => season.number);
  const episodeIds = numbering.episodes.map((episode) => episode.id);
  const episodeSeasons = numbering.episodes.map((episode) => episode.seasonId);
  const episodeNumbers = numbering.episodes.map((episode) => episode.episodeNumber);
  const inSeason = numbering.episodes.map((episode) => episode.seasonEpisodeNumber);

  await tx.$executeRaw`UPDATE "Season" SET "number" = "number" + ${PARK_OFFSET} WHERE "seriesId" = ${seriesId}`;
  await tx.$executeRaw`
    UPDATE "Episode"
    SET "episodeNumber" = "episodeNumber" + ${PARK_OFFSET},
        "seasonEpisodeNumber" = COALESCE("seasonEpisodeNumber", 0) + ${PARK_OFFSET}
    WHERE "seriesId" = ${seriesId}`;

  await tx.$executeRaw`
    UPDATE "Season" s SET "number" = v.number
    FROM unnest(${seasonIds}::text[], ${seasonNumbers}::int[]) AS v(id, number)
    WHERE s.id = v.id AND s."seriesId" = ${seriesId}`;
  await tx.$executeRaw`
    UPDATE "Episode" e
    SET "seasonId" = v.season, "episodeNumber" = v.overall, "seasonEpisodeNumber" = v.within
    FROM unnest(${episodeIds}::text[], ${episodeSeasons}::text[], ${episodeNumbers}::int[], ${inSeason}::int[]) AS v(id, season, overall, within)
    WHERE e.id = v.id AND e."seriesId" = ${seriesId}`;
}

/**
 * Runs `change` on the series' layout under its lock and saves the result.
 * `change` returns the new layout, or a string to refuse (nothing is written).
 */
export async function changeSeasonLayout<T extends string>(
  seriesId: string,
  change: (layout: SeasonLayout, tx: Tx) => Promise<SeasonLayout | T> | SeasonLayout | T,
): Promise<{ ok: true; layout: SeasonLayout } | { ok: false; reason: T }> {
  return prisma.$transaction(async (tx) => {
    await lockSeriesSeasons(tx, seriesId);
    await ensureSeasons(tx, seriesId);
    const result = await change(await readLayout(tx, seriesId), tx);
    if (typeof result === "string") return { ok: false as const, reason: result };
    await writeNumbering(tx, seriesId, numberLayout(result));
    return { ok: true as const, layout: result };
  }, SEASON_TRANSACTION);
}

/**
 * Where a new episode goes: the end of the latest season, which is also the
 * end of the series. Call inside a transaction that then creates the episode.
 */
export async function placeNewEpisode(tx: Tx, seriesId: string) {
  await lockSeriesSeasons(tx, seriesId);
  const seasonId = await ensureSeasons(tx, seriesId);
  const [overall, within] = await Promise.all([
    tx.episode.aggregate({ where: { seriesId }, _max: { episodeNumber: true } }),
    tx.episode.aggregate({ where: { seasonId }, _max: { seasonEpisodeNumber: true } }),
  ]);
  return {
    seasonId,
    episodeNumber: (overall._max.episodeNumber ?? 0) + 1,
    seasonEpisodeNumber: (within._max.seasonEpisodeNumber ?? 0) + 1,
  };
}
