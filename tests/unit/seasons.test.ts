import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
  SEASON_DESCRIPTION_MAX,
  SEASON_TITLE_MAX,
  displayedSeasonStatus,
  episodeCode,
  episodeHeading,
  moveEpisode,
  numberLayout,
  openingSeason,
  parseSeasonFields,
  readerVisibleSeasons,
  reorderSeasons,
  seasonDeleteBlocker,
  seasonLabel,
  showSeasonCodes,
  type SeasonLayout,
} from "@/lib/season-rules";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const layout: SeasonLayout = [
  { id: "s1", episodeIds: ["a", "b", "c"] },
  { id: "s2", episodeIds: ["d", "e"] },
  { id: "s3", episodeIds: [] },
];

describe("Sweep G: season labels", () => {
  test("labels show the season only when readers can tell seasons apart", () => {
    assert.equal(showSeasonCodes([1]), false);
    assert.equal(showSeasonCodes([]), false);
    assert.equal(showSeasonCodes([1, 2]), true);
    assert.equal(showSeasonCodes([2]), true); // Season 1 is still a draft
    assert.equal(episodeCode({ seasonNumber: 2, numberInSeason: 3 }, true), "S2 E3");
    assert.equal(episodeCode({ seasonNumber: 1, numberInSeason: 3 }, false), "E3");
    assert.equal(episodeHeading({ seasonNumber: 2, numberInSeason: 3 }, true), "Season 2 · Episode 3");
    assert.equal(seasonLabel({ number: 2, title: "  The Salt War " }), "Season 2: The Salt War");
    assert.equal(seasonLabel({ number: 1, title: null }), "Season 1");
  });

  test("readers see seasons with a published episode; the page opens where they are, else the latest", () => {
    const seasons = [
      { number: 1, publishedCount: 4 },
      { number: 2, publishedCount: 0 },
      { number: 3, publishedCount: 2 },
    ];
    const visible = readerVisibleSeasons(seasons);
    assert.deepEqual(visible.map((season) => season.number), [1, 3]);
    assert.equal(openingSeason(visible, 1), 1);
    assert.equal(openingSeason(visible, null), 3);
    assert.equal(openingSeason(visible, 2), 3); // resume season hidden: fall back
    assert.equal(openingSeason([], null), 1);
  });

  test("a complete series shows every season complete; seasons never change the series", () => {
    assert.equal(displayedSeasonStatus("ONGOING", true), "COMPLETE");
    assert.equal(displayedSeasonStatus("ONGOING", false), "ONGOING");
    assert.equal(displayedSeasonStatus("COMPLETE", false), "COMPLETE");
  });
});

describe("Sweep G: season fields", () => {
  test("titles and descriptions are trimmed, limited, and blank clears them", () => {
    assert.deepEqual(parseSeasonFields({ title: "  The   Salt War ", description: "" }), {
      ok: true,
      fields: { title: "The Salt War", description: null },
    });
    assert.deepEqual(parseSeasonFields({ status: "COMPLETE" }), { ok: true, fields: { status: "COMPLETE" } });
    assert.equal(parseSeasonFields({ title: "x".repeat(SEASON_TITLE_MAX + 1) }).ok, false);
    assert.equal(parseSeasonFields({ description: "x".repeat(SEASON_DESCRIPTION_MAX + 1) }).ok, false);
    assert.equal(parseSeasonFields({ title: 5 }).ok, false);
    assert.equal(parseSeasonFields({ status: "DONE" }).ok, false);
    assert.equal(parseSeasonFields(null).ok, false);
  });
});

describe("Sweep G: numbering", () => {
  test("seasons 1..n, episodes 1..n overall and 1..k within each season, no gaps", () => {
    const numbering = numberLayout(layout);
    assert.deepEqual(numbering.seasons, [
      { id: "s1", number: 1 },
      { id: "s2", number: 2 },
      { id: "s3", number: 3 },
    ]);
    assert.deepEqual(
      numbering.episodes.map((episode) => [episode.id, episode.seasonId, episode.episodeNumber, episode.seasonEpisodeNumber]),
      [
        ["a", "s1", 1, 1],
        ["b", "s1", 2, 2],
        ["c", "s1", 3, 3],
        ["d", "s2", 4, 1],
        ["e", "s2", 5, 2],
      ],
    );
  });

  test("moving across the next boundary keeps the reading order", () => {
    const later = moveEpisode(layout, "c", "s2")!;
    assert.deepEqual(later.map((season) => season.episodeIds), [["a", "b"], ["c", "d", "e"], []]);
    assert.deepEqual(numberLayout(later).episodes.map((episode) => episode.id), ["a", "b", "c", "d", "e"]);

    const earlier = moveEpisode(layout, "d", "s1")!;
    assert.deepEqual(earlier.map((season) => season.episodeIds), [["a", "b", "c", "d"], ["e"], []]);
  });

  test("moving the only episode out leaves an empty season; bad ids are refused", () => {
    const one: SeasonLayout = [
      { id: "s1", episodeIds: ["a"] },
      { id: "s2", episodeIds: ["b"] },
    ];
    assert.deepEqual(moveEpisode(one, "b", "s1")!.map((season) => season.episodeIds), [["a", "b"], []]);
    assert.equal(moveEpisode(layout, "zz", "s1"), null);
    assert.equal(moveEpisode(layout, "a", "zz"), null);
    assert.equal(moveEpisode(layout, "a", "s1"), layout);
  });

  test("reordering needs every season exactly once and renumbers everything", () => {
    const reordered = reorderSeasons(layout, ["s2", "s1", "s3"])!;
    assert.deepEqual(numberLayout(reordered).episodes.map((episode) => [episode.id, episode.episodeNumber, episode.seasonEpisodeNumber]), [
      ["d", 1, 1],
      ["e", 2, 2],
      ["a", 3, 1],
      ["b", 4, 2],
      ["c", 5, 3],
    ]);
    assert.equal(reorderSeasons(layout, ["s1", "s2"]), null);
    assert.equal(reorderSeasons(layout, ["s1", "s1", "s2"]), null);
    assert.equal(reorderSeasons(layout, ["s1", "s2", "zz"]), null);
  });

  test("a season can be deleted only when it's empty and not the last one", () => {
    assert.equal(seasonDeleteBlocker(layout, "s3"), null);
    assert.equal(seasonDeleteBlocker(layout, "s2"), "NOT_EMPTY");
    assert.equal(seasonDeleteBlocker([{ id: "s1", episodeIds: [] }], "s1"), "LAST_SEASON");
    assert.equal(seasonDeleteBlocker(layout, "zz"), "NOT_FOUND");
  });
});

describe("Sweep G: data and routes", () => {
  test("the migration only adds, and backfills Season 1 keeping every number", () => {
    const sql = read("prisma/migrations/20261027090000_seasons/migration.sql");
    assert.doesNotMatch(sql, /\bDROP\b|RENAME|ALTER COLUMN/i);
    assert.match(sql, /INSERT INTO "Season"[\s\S]*'season1-' \|\| s\."id"[\s\S]*WHERE NOT EXISTS/);
    assert.match(sql, /SET "seasonId" = 'season1-' \|\| e\."seriesId", "seasonEpisodeNumber" = e\."episodeNumber"\s+WHERE e\."seasonId" IS NULL/);
    assert.match(sql, /ON DELETE NO ACTION/);
  });

  test("numbers and seasons are server-controlled", () => {
    const save = read("app/api/writer-studio/episodes/[episodeId]/route.ts");
    const create = read("app/api/writer-studio/episodes/route.ts");
    assert.doesNotMatch(save, /episodeNumber|seasonId/);
    assert.doesNotMatch(create.split("export async function POST")[0], /episodeNumber|seasonId/);
    assert.match(create, /placeNewEpisode\(tx, owned\.series\.id\)/);
    assert.match(read("app/api/writer-studio/series/route.ts"), /seasons: \{ create: \{ number: 1 \} \}/);
  });
});
