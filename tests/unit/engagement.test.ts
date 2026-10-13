import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
  COMMENT_MAX_LENGTH,
  PAPER_BACKGROUNDS,
  SERIES_RATING_MIN_COUNT,
  STAR_FALLBACKS,
  STAR_MIN_CONTRAST,
  checkCommentBody,
  commentRateLimited,
  isReportReason,
  normalizeCommentBody,
  parseRatingValue,
  seriesRatingSummary,
  starColors,
} from "@/lib/engagement-rules";
import { contrastRatio } from "@/lib/series-color";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("ratings", () => {
  test("only whole stars from 1 to 5", () => {
    for (const value of [1, 2, 3, 4, 5]) assert.equal(parseRatingValue(value), value);
    for (const value of [0, 6, 4.5, -1, "4", null, undefined, Number.NaN, Infinity]) assert.equal(parseRatingValue(value), null, String(value));
  });

  test("the series rating is hidden below the minimum and shown as e.g. 4.6 (128 ratings)", () => {
    assert.equal(SERIES_RATING_MIN_COUNT, 3);
    assert.equal(seriesRatingSummary(5, 2), null);
    assert.equal(seriesRatingSummary(null, 0), null);
    assert.equal(seriesRatingSummary(4.5625, 128)?.text, "4.6 (128 ratings)");
    assert.equal(seriesRatingSummary(4, 3)?.text, "4.0 (3 ratings)");
    assert.equal(seriesRatingSummary(3.04, 1200)?.text, "3.0 (1,200 ratings)");
    assert.equal(seriesRatingSummary(5, 1, 1)?.text, "5.0 (1 rating)", "the minimum is a parameter");
  });

  test("pooling: every vote counts once (not an average of episode averages)", () => {
    // Episode A: one 5; episode B: three 1s. Pooled = 2.0; averaging the averages would say 3.0.
    const votes = [5, 1, 1, 1];
    const pooled = votes.reduce((sum, value) => sum + value, 0) / votes.length;
    assert.equal(seriesRatingSummary(pooled, votes.length)?.value, "2.0");
    // The service aggregates Rating rows directly, never per-episode averages.
    const service = read("lib/ratings.ts");
    assert.match(service, /prisma\.rating\.aggregate\(/);
    assert.doesNotMatch(service, /groupBy/);
  });

  test("filled stars use the series color only where it clears 3:1 on the paper, in each theme", () => {
    for (const color of ["#7c3aed", "#facc15", "#ffffff", "#000000", "#22d3ee", "#e11d48", null, "not-a-color"]) {
      const chosen = starColors(color);
      for (const mode of ["light", "dark"] as const) {
        assert.ok(contrastRatio(chosen[mode], PAPER_BACKGROUNDS[mode]) >= STAR_MIN_CONTRAST, `${color} ${mode}`);
      }
    }
    assert.deepEqual(starColors("#7c3aed").light, "#7c3aed");
    assert.deepEqual(starColors("#ffffff"), { light: STAR_FALLBACKS.light, dark: "#ffffff" });
    assert.deepEqual(starColors("#000000"), { light: "#000000", dark: STAR_FALLBACKS.dark });
    assert.deepEqual(starColors(null), STAR_FALLBACKS);
  });

  test("authors can't rate their own episodes (server-side, against the series and episode author)", () => {
    const service = read("lib/ratings.ts");
    assert.match(service, /isEpisodeCreator\(episode, userId\)/);
    assert.match(read("lib/engagement.ts"), /episode\.authorId === userId \|\| episode\.series\.authorId === userId/);
  });
});

describe("comments", () => {
  test("bodies are trimmed, cleaned of control characters, and 1 to 1,000 characters", () => {
    assert.deepEqual(checkCommentBody("  hello  "), { ok: true, body: "hello" });
    assert.equal(checkCommentBody("   \n\t ").ok, false);
    assert.equal(checkCommentBody(42).ok, false);
    assert.equal(checkCommentBody("x".repeat(COMMENT_MAX_LENGTH)).ok, true);
    assert.equal(checkCommentBody("x".repeat(COMMENT_MAX_LENGTH + 1)).ok, false);
    assert.equal(checkCommentBody(`  ${"x".repeat(COMMENT_MAX_LENGTH)}  `).ok, true, "length counts after trimming");
    assert.equal(normalizeCommentBody("a\r\nb\u0000c‮d"), "a\nbcd");
    assert.equal(normalizeCommentBody("one\n\n\n\n\ntwo"), "one\n\ntwo");
    // HTML is kept as literal text (rendered escaped), never interpreted.
    assert.equal(normalizeCommentBody("<b>hi</b>"), "<b>hi</b>");
  });

  test("posting is rate-limited per minute and per hour", () => {
    const now = Date.now();
    const ago = (ms: number) => new Date(now - ms);
    assert.equal(commentRateLimited([], now), false);
    assert.equal(commentRateLimited([1, 2, 3, 4].map((s) => ago(s * 1000)), now), false);
    assert.equal(commentRateLimited([1, 2, 3, 4, 5].map((s) => ago(s * 1000)), now), true, "5 in a minute");
    assert.equal(commentRateLimited([1, 2, 3, 4, 5].map((s) => ago(s * 61_000)), now), false);
    assert.equal(commentRateLimited(Array.from({ length: 30 }, (_, i) => ago((i + 1) * 100_000)), now), true, "30 in an hour");
  });

  test("comments render as plain text, never HTML", () => {
    for (const file of ["components/engagement/CommentsSection.tsx", "components/reader/ReaderActivity.tsx", "app/administration/reports/page.tsx"]) {
      assert.doesNotMatch(read(file), /dangerouslySetInnerHTML/, file);
    }
  });

  test("report reasons are a fixed list", () => {
    assert.ok(isReportReason("SPAM"));
    assert.ok(!isReportReason("spam"));
    assert.ok(!isReportReason("ANYTHING"));
  });
});

describe("engagement routes", () => {
  const routes = [
    "app/api/me/bookmarks/route.ts",
    "app/api/me/bookmarks/[episodeId]/route.ts",
    "app/api/me/ratings/[episodeId]/route.ts",
    "app/api/comments/[commentId]/route.ts",
    "app/api/comments/[commentId]/report/route.ts",
  ];

  test("every write (and the bookmarks list) signs the caller in with requireApiUser and takes no user id", () => {
    for (const route of routes) {
      const source = read(route);
      for (const handler of source.match(/export async function \w+/g) ?? []) {
        const body = source.slice(source.indexOf(handler));
        assert.match(body, /await requireApiUser\(\)[\s\S]*?if \(!guard\.ok\) return guard\.response/, `${route} ${handler}`);
      }
      assert.doesNotMatch(source, /params\.userId|body\.data\.userId|userId:/, route);
    }
    const comments = read("app/api/comments/route.ts");
    assert.match(comments.slice(comments.indexOf("export async function POST")), /await requireApiUser\(\)/);
  });

  test("public reads still respect Renovation Mode; Activity respects its visibility", () => {
    const comments = read("app/api/comments/route.ts");
    assert.match(comments.slice(comments.indexOf("export async function GET")), /await requirePlatformOpen\(\)/);
    const activity = read("app/api/readers/[readerId]/activity/route.ts");
    assert.match(activity, /await requirePlatformOpen\(\)/);
    assert.match(activity, /canViewActivity\(owner, guard\.user\?\.id\)/);
  });

  test("the public profile only lists bookmarks through Activity, and only when it is public", () => {
    // The public page always uses the visitor's Reading view, which lists bookmarks only for the owner.
    assert.match(read("app/reader/[readerId]/page.tsx"), /<ReadingView member=\{reader\} isOwner=\{false\} \/>/);
    const view = read("components/profile/ReadingView.tsx");
    const visitorPart = view.slice(view.indexOf("const libraryPublic"));
    assert.doesNotMatch(visitorPart, /listBookmarks|ReaderBookmarks/);
    assert.match(visitorPart, /activityPublic \? listActivity\(member\.id\) : null/);
  });

  test("no hearts and no fake ratings remain", () => {
    assert.doesNotMatch(read("components/reader/ReaderProfileTabs.tsx"), /heart/i);
    assert.doesNotMatch(read("app/author/[authorId]/page.tsx"), /Rating placeholder|4\.8\/5/);
  });
});
