import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { continuePoint } from "@/lib/reading-progress-rules";
import { primaryRow } from "@/lib/series-rows-rules";
import { MAX_SERIES_TAGS, SERIES_TAGS, knownSeriesTags, parseSeriesTags } from "@/lib/series-tags";
import { SERIES } from "../../scripts/seed-test/catalogue";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("recommendation rows", () => {
  test("Row 1: same genre, else Like this one, else More for you, else nothing", () => {
    assert.deepEqual(primaryRow({ genre: ["a"], like: ["b"], forYou: ["c"] }, "fantasy"), { kind: "genre", title: "More in Fantasy", cards: ["a"] });
    assert.deepEqual(primaryRow({ genre: [], like: ["b"], forYou: ["c"] }, "fantasy"), { kind: "like", title: "Like this one", cards: ["b"] });
    assert.deepEqual(primaryRow({ genre: [], like: [], forYou: ["c"] }, "fantasy"), { kind: "forYou", title: "More for you", cards: ["c"] });
    assert.equal(primaryRow({ genre: [], like: [], forYou: [] }, "fantasy"), null);
  });

  test("the series page builds its rows through one server function", () => {
    const data = read("lib/series-page.ts");
    assert.match(data, /export async function getSeriesRows\(/);
    assert.doesNotMatch(data, /getSeriesRails/);
  });
});

describe("sub tags", () => {
  test("a fixed list; up to 3; matched without regard to case, stored in the list's spelling", () => {
    assert.equal(MAX_SERIES_TAGS, 3);
    assert.equal(new Set(SERIES_TAGS).size, SERIES_TAGS.length);
    assert.deepEqual(parseSeriesTags(["heist", "Ghosts"]), { ok: true, tags: ["Heist", "Ghosts"] });
    assert.equal(parseSeriesTags(["Heist", "Ghosts", "Cosy", "Space"]).ok, false);
    assert.equal(parseSeriesTags(["Heist", "made up"]).ok, false);
    assert.equal(parseSeriesTags("Heist").ok, false);
    assert.deepEqual(parseSeriesTags([]), { ok: true, tags: [] });
  });

  test("the test catalogue only uses listed tags", () => {
    for (const series of SERIES) assert.deepEqual(knownSeriesTags(series.tags), series.tags, series.title);
  });

  test("stored values not on the list are ignored when shown", () => {
    assert.deepEqual(knownSeriesTags(["epic", "Slow burn", "slow burn", "Space", "Heist", "Ghosts"]), ["Slow burn", "Space", "Heist"]);
    assert.deepEqual(knownSeriesTags(null), []);
  });
});

describe("Continue (Sweep A)", () => {
  const episodes = [1, 2, 3, 4, 5].map((n) => ({ id: `e${n}`, episodeNumber: n }));
  const at = (minutes: number) => new Date(Date.UTC(2026, 9, 15, 12, minutes));

  test("goes to the most recently read episode, whatever else is unfinished", () => {
    const point = continuePoint(episodes, [
      { episodeId: "e2", percent: 40, updatedAt: at(1) },
      { episodeId: "e4", percent: 60, updatedAt: at(9) },
    ]);
    assert.deepEqual(point, { episodeId: "e4", episodeNumber: 4, kind: "continue" });
  });

  test("finished the latest one: the next episode; finished the last episode: read again", () => {
    const started2Finished5 = [
      { episodeId: "e2", percent: 40, updatedAt: at(1) },
      { episodeId: "e4", percent: 100, updatedAt: at(9) },
    ];
    assert.deepEqual(continuePoint(episodes, started2Finished5), { episodeId: "e5", episodeNumber: 5, kind: "next" });
    assert.deepEqual(continuePoint(episodes, [{ episodeId: "e5", percent: 100, updatedAt: at(3) }]), { episodeId: "e1", episodeNumber: 1, kind: "again" });
  });

  test("the episode strip keeps episode order (no card moved to the front)", () => {
    const strip = read("components/series/EpisodeStrip.tsx");
    assert.doesNotMatch(strip, /\[resume, \.\.\./);
    assert.match(strip, /continueCard=\{episode\.id === resume\?\.id\}/);
  });
});
