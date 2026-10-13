import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { coverThumbUrl } from "@/lib/cover-thumbs";
import { PAPER_BACKGROUNDS } from "@/lib/engagement-rules";
import { WORDS_PER_MINUTE, estimateReadTime } from "@/lib/episode-content/text";
import { FINISHED_PERCENT, continuePoint, parsePercent } from "@/lib/reading-progress-rules";
import { ACCENT_MIN_CONTRAST, placeholderGradient, seriesAccents } from "@/lib/series-accent";
import { contrastRatio } from "@/lib/series-color";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("continue reading", () => {
  const episodes = [1, 2, 3, 4].map((n) => ({ id: `e${n}`, episodeNumber: n }));
  const at = (minutes: number) => new Date(Date.UTC(2026, 9, 13, 12, minutes));

  test("nothing started: no continue point", () => {
    assert.equal(continuePoint(episodes, []), null);
    assert.equal(continuePoint(episodes, [{ episodeId: "other", percent: 50, updatedAt: at(0) }]), null);
  });

  test("the most recently read unfinished episode comes first", () => {
    const point = continuePoint(episodes, [
      { episodeId: "e1", percent: 100, updatedAt: at(1) },
      { episodeId: "e3", percent: 30, updatedAt: at(5) },
      { episodeId: "e2", percent: 60, updatedAt: at(3) },
    ]);
    assert.deepEqual(point, { episodeId: "e3", episodeNumber: 3, kind: "continue" });
  });

  test("all started ones finished: the next episode after the furthest; all finished: read again", () => {
    const finished = (ids: string[]) => ids.map((id, i) => ({ episodeId: id, percent: FINISHED_PERCENT, updatedAt: at(i) }));
    assert.deepEqual(continuePoint(episodes, finished(["e1", "e2"])), { episodeId: "e3", episodeNumber: 3, kind: "next" });
    assert.deepEqual(continuePoint(episodes, finished(["e1", "e2", "e3", "e4"])), { episodeId: "e1", episodeNumber: 1, kind: "again" });
  });

  test("progress is a whole percentage from 0 to 100", () => {
    assert.equal(parsePercent(42.6), 43);
    assert.equal(parsePercent(-5), 0);
    assert.equal(parsePercent(250), 100);
    for (const bad of [Number.NaN, Infinity, "50", null]) assert.equal(parsePercent(bad), null);
  });
});

describe("series color and placeholders", () => {
  test("the accent keeps 3:1 contrast on the page in both themes, falling back when the series color can't", () => {
    for (const color of ["#0ea5e9", "#ffffff", "#000000", "#facc15", "#7c3aed", null, "nope"]) {
      const accent = seriesAccents(color);
      assert.ok(contrastRatio(accent.light, PAPER_BACKGROUNDS.light) >= ACCENT_MIN_CONTRAST, `${color} light`);
      assert.ok(contrastRatio(accent.dark, PAPER_BACKGROUNDS.dark) >= ACCENT_MIN_CONTRAST, `${color} dark`);
      assert.ok(contrastRatio(accent.light, accent.lightInk) >= 3 && contrastRatio(accent.dark, accent.darkInk) >= 3, `${color} button text`);
    }
    assert.equal(seriesAccents("#7c3aed").light, "#7c3aed", "a usable series color is kept");
  });

  test("the generated episode picture is deterministic and differs between episodes", () => {
    assert.equal(placeholderGradient("#e11d48", 3), placeholderGradient("#e11d48", 3));
    assert.notEqual(placeholderGradient("#e11d48", 3), placeholderGradient("#e11d48", 4));
    assert.notEqual(placeholderGradient("#e11d48", 3), placeholderGradient("#2563eb", 3));
  });
});

describe("images and reading time", () => {
  test("covers have a derived 480px small copy; other images don't", () => {
    const blob = "https://abc.public.blob.vercel-storage.com/images/series-cover/1234.webp";
    assert.equal(coverThumbUrl(blob), "https://abc.public.blob.vercel-storage.com/images/series-cover/1234-480.webp");
    assert.equal(
      coverThumbUrl("https://abc.public.blob.vercel-storage.com/images/episode-cover/9.webp"),
      "https://abc.public.blob.vercel-storage.com/images/episode-cover/9-480.webp",
    );
    for (const other of [
      "https://abc.public.blob.vercel-storage.com/images/profile-image/1.webp",
      "https://abc.public.blob.vercel-storage.com/images/series-cover/1234-480.webp",
      "http://abc.public.blob.vercel-storage.com/images/series-cover/1.webp",
      "data:image/svg+xml,<svg/>",
      "/avatars/reader-default.svg",
      null,
    ]) {
      assert.equal(coverThumbUrl(other), null, String(other));
    }
  });

  test("no Vercel image optimization is used (images are served straight from storage)", () => {
    for (const file of ["app/series/[seriesId]/page.tsx", "components/series/CoverImage.tsx", "components/series/SeriesRail.tsx", "components/series/EpisodeStrip.tsx"]) {
      assert.doesNotMatch(read(file), /next\/image/, file);
    }
  });

  test("reading time uses 230 words a minute", () => {
    assert.equal(WORDS_PER_MINUTE, 230);
    assert.equal(estimateReadTime(230), 1);
    assert.equal(estimateReadTime(231), 2);
    assert.equal(estimateReadTime(0), 1);
  });
});

describe("routes and data", () => {
  test("the progress route signs the caller in and takes no user id", () => {
    const source = read("app/api/me/progress/[episodeId]/route.ts");
    assert.match(source, /await requireApiUser\(\)[\s\S]*?if \(!guard\.ok\) return guard\.response/);
    assert.doesNotMatch(source, /userId/);
  });

  test("the series page never loads story text, and every rail goes through one function", () => {
    const data = read("lib/series-page.ts");
    assert.doesNotMatch(data, /body:\s*true/);
    assert.match(data, /function railVisibility\(\)/);
    assert.match(data, /\$\{railVisibility\(\)\}/);
    assert.doesNotMatch(read("app/series/[seriesId]/page.tsx"), /prisma\./, "the page itself runs no queries");
  });
});
