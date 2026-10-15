import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { ERROR_CODES, ERROR_COPY } from "@/lib/error-copy";
import { RECENCY_FADE_DAYS, TRENDING_WEIGHTS, parseExploreSort, rankExplore, trendingScore, type ExploreSignals } from "@/lib/explore-ranking";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 16, 12);
const series = (id: string, patch: Partial<ExploreSignals> = {}): ExploreSignals => ({
  id,
  reads: 0,
  recentReads: 0,
  newFollows: 0,
  ratingAvg: null,
  ratingCount: 0,
  firstPublishedAt: new Date(now - 30 * DAY),
  lastPublishedAt: new Date(now - 30 * DAY),
  createdAt: new Date(now - 40 * DAY),
  ...patch,
});

describe("Explore ranking", () => {
  test("trending uses the named weights: recent reads, new follows, rating (3+ only), recency", () => {
    assert.equal(trendingScore(series("a", { recentReads: 4 }), now), 4 * TRENDING_WEIGHTS.recentReads);
    assert.equal(trendingScore(series("a", { newFollows: 2 }), now), 2 * TRENDING_WEIGHTS.newFollows);
    assert.equal(trendingScore(series("a", { ratingAvg: 4, ratingCount: 2 }), now), 0, "under 3 ratings: ignored");
    assert.equal(trendingScore(series("a", { ratingAvg: 4, ratingCount: 3 }), now), 4 * TRENDING_WEIGHTS.rating);
    assert.equal(trendingScore(series("a", { lastPublishedAt: new Date(now) }), now), TRENDING_WEIGHTS.recency);
    assert.equal(trendingScore(series("a", { lastPublishedAt: new Date(now - RECENCY_FADE_DAYS * DAY) }), now), 0);
  });

  test("trending is about now, not all-time reads; newest is when a series first went public", () => {
    const old = series("old", { reads: 5000, firstPublishedAt: new Date(now - 300 * DAY) });
    const hot = series("hot", { reads: 10, recentReads: 9, firstPublishedAt: new Date(now - 60 * DAY) });
    const fresh = series("fresh", { firstPublishedAt: new Date(now - 1 * DAY), createdAt: new Date(now - 200 * DAY) });
    const orders = rankExplore([old, hot, fresh], now);
    assert.equal(orders.trending[0], "hot");
    assert.deepEqual(orders.newest, ["fresh", "hot", "old"]);
  });

  test("the sort is trending unless it says newest", () => {
    assert.equal(parseExploreSort("newest"), "newest");
    for (const value of ["trending", "", undefined, "NEWEST", "random"]) assert.equal(parseExploreSort(value), "trending");
  });
});

describe("error pages", () => {
  test("every code has a title, a line and one next step", () => {
    for (const code of ERROR_CODES) {
      const copy = ERROR_COPY[code];
      assert.ok(copy.title && copy.line && copy.action.label, String(code));
    }
    assert.equal(ERROR_COPY[401].action.kind === "link" && ERROR_COPY[401].action.href, "/sign-in");
  });

  test("the scene and the global error page need no database, session or providers", () => {
    for (const file of ["components/errors/ErrorScene.tsx", "components/errors/ErrorPage.tsx", "app/global-error.tsx", "lib/error-copy.ts"]) {
      const source = read(file);
      assert.doesNotMatch(source, /@\/lib\/prisma|@\/auth"|useAuthSession|ThemeProvider/, file);
    }
    for (const image of ["public/brand/night-desert-800.webp", "public/brand/night-desert-1600.webp"]) {
      assert.ok(existsSync(join(process.cwd(), image)), image);
      assert.ok(statSync(join(process.cwd(), image)).size < 200 * 1024, `${image} is small`);
    }
  });
});

describe("sign-out", () => {
  test("the server clears the cookie before touching the database, and never caches the answer", () => {
    const auth = read("auth.ts");
    const clear = auth.slice(auth.indexOf("export async function clearSession"));
    assert.ok(clear.indexOf("clearSessionCookie()") < clear.indexOf("invalidateSession(sessionToken)"));
    assert.match(read("app/api/auth/logout/route.ts"), /no-store/);
  });

  test("the client always finishes: a time limit, a full load home, a retry flag, no stuck button", () => {
    const provider = read("components/providers/AuthSessionProvider.tsx");
    assert.match(provider, /AbortSignal\.timeout\(SIGN_OUT_TIMEOUT_MS\)/);
    assert.match(provider, /window\.location\.replace\("\/"\)/);
    assert.match(provider, /PENDING_SIGN_OUT_KEY/);
    const shell = read("components/app-shell/AppShell.tsx");
    assert.match(shell, /signOutAndGoHome/);
    assert.doesNotMatch(shell, /router\.push\("\/"\)/);
  });
});

describe("logo", () => {
  test("the icons and the round mark exist and are small; the 1.7 MB original isn't public", () => {
    for (const [file, maxKb] of [
      ["app/favicon.ico", 20],
      ["app/icon.png", 10],
      ["app/apple-icon.png", 60],
      ["public/brand/mark-64.webp", 10],
      ["public/brand/mark-128.webp", 20],
      ["app/opengraph-image.png", 200],
    ] as const) {
      assert.ok(statSync(join(process.cwd(), file)).size < maxKb * 1024, file);
    }
    assert.equal(existsSync(join(process.cwd(), "public/logo-934.png")), false);
  });
});
