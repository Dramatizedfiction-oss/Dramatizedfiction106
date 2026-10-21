/*
 * Sweep C: the feed against the scratch database (throwaway tagged fixtures,
 * removed afterwards), plus its HTTP routes when the dev server is running.
 * Prints each fixture reader's feed and two score breakdowns as test
 * diagnostics (run with --test-reporter=spec to read them).
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { getScoreBreakdown, setSeriesModeration } from "@/lib/feed/admin";
import { getFeed, getFreshFeedPool } from "@/lib/feed/server";
import { refreshAllStatsOnce } from "@/lib/feed/stats";
import type { FeedPool } from "@/lib/feed/types";
import { prisma } from "@/lib/prisma";
import { BASE_URL, TAG, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

let reachable = false;
const ids: Record<string, string> = {};
const users: Record<string, string> = {};

async function writer(label: string, ageDays = 200) {
  const user = await makeUser("WRITER", label);
  await prisma.user.update({ where: { id: user.id }, data: { createdAt: ago(ageDays) } });
  users[label] = user.id;
  return user.id;
}

async function reader(label: string, ageDays = 30) {
  const user = await makeUser("READER", label);
  await prisma.user.update({ where: { id: user.id }, data: { createdAt: ago(ageDays) } });
  users[label] = user.id;
  return user.id;
}

/** A published series with `episodes` episodes, published evenly from `firstDaysAgo` to `lastDaysAgo`. */
async function publishedSeries(
  key: string,
  authorId: string,
  options: { genre: string; tags?: string[]; episodes: number; firstDaysAgo: number; lastDaysAgo: number; complete?: boolean },
) {
  const series = await prisma.series.create({
    data: {
      title: `${TAG} ${key}`,
      description: `Feed fixture ${key}`,
      genre: options.genre,
      tags: options.tags ?? [],
      aiUsageTag: "AI_FREE",
      authorId,
      status: "PUBLISHED",
      isComplete: options.complete ?? false,
      completedAt: options.complete ? ago(options.lastDaysAgo) : null,
    },
  });
  for (let number = 1; number <= options.episodes; number++) {
    const step = options.episodes > 1 ? (options.firstDaysAgo - options.lastDaysAgo) / (options.episodes - 1) : 0;
    await prisma.episode.create({
      data: {
        title: `${key} ${number}`,
        episodeNumber: number,
        body: "<p>Fixture text.</p>",
        readTime: 5,
        status: "PUBLISHED",
        publishedAt: ago(options.firstDaysAgo - step * (number - 1)),
        aiUsageTag: "AI_FREE",
        seriesId: series.id,
        authorId,
      },
    });
  }
  ids[key] = series.id;
  return series.id;
}

const firstEpisode = async (key: string) =>
  (await prisma.episode.findFirstOrThrow({ where: { seriesId: ids[key] }, orderBy: { episodeNumber: "asc" }, select: { id: true } })).id;

let pool: FeedPool;

before(async () => {
  reachable = await serverReachable();

  // Writers: three new (one prolific), three established, one held series, one banned.
  const nw1 = await writer("nw1");
  const nw2 = await writer("nw2");
  const nw3 = await writer("nw3-prolific");
  const est = await writer("est");
  const est2 = await writer("est2");
  const est3 = await writer("est3");
  const held = await writer("held");
  const banned = await writer("banned");

  await publishedSeries("A-new", nw1, { genre: "romance", tags: ["Slow burn"], episodes: 1, firstDaysAgo: 2, lastDaysAgo: 2 });
  await publishedSeries("B-new", nw2, { genre: "romance", tags: ["Small town"], episodes: 2, firstDaysAgo: 30, lastDaysAgo: 5 });
  // The prolific new writer: 10 episodes across three series in the last 20 days.
  await publishedSeries("C1-prolific", nw3, { genre: "romance", episodes: 4, firstDaysAgo: 20, lastDaysAgo: 12 });
  await publishedSeries("C2-prolific", nw3, { genre: "romance", episodes: 3, firstDaysAgo: 11, lastDaysAgo: 6 });
  await publishedSeries("C3-prolific", nw3, { genre: "fantasy", episodes: 3, firstDaysAgo: 5, lastDaysAgo: 1 });
  await publishedSeries("D-established", est, { genre: "romance", tags: ["Slow burn"], episodes: 8, firstDaysAgo: 90, lastDaysAgo: 3, complete: true });
  await publishedSeries("E-established", est2, { genre: "romance", tags: ["Slow burn"], episodes: 6, firstDaysAgo: 120, lastDaysAgo: 4 });
  await publishedSeries("F-established", est3, { genre: "romance", tags: ["Slow burn", "Second chance"], episodes: 7, firstDaysAgo: 150, lastDaysAgo: 8 });
  await publishedSeries("H-held", held, { genre: "romance", tags: ["Slow burn"], episodes: 1, firstDaysAgo: 1, lastDaysAgo: 1 });
  await publishedSeries("R-banned", banned, { genre: "romance", tags: ["Slow burn"], episodes: 1, firstDaysAgo: 1, lastDaysAgo: 1 });
  await prisma.series.update({ where: { id: ids["H-held"] }, data: { moderationStatus: "HELD" } });
  await prisma.memberRestriction.create({ data: { userId: banned, kind: "BAN", reason: `${TAG} fixture` } });

  // Readers.
  await reader("cold");
  const taste = await reader("taste");
  const raters = await Promise.all([1, 2, 3, 4, 5].map((n) => reader(`rater${n}`)));
  const fresh = await reader("fresh-account", 0);

  // E: five 5-star ratings (Top Rated). D: only two ratings (under 3: no average).
  for (const rater of raters) await prisma.rating.create({ data: { userId: rater, episodeId: await firstEpisode("E-established"), value: 5 } });
  for (const rater of raters.slice(0, 2)) await prisma.rating.create({ data: { userId: rater, episodeId: await firstEpisode("D-established"), value: 4 } });
  // A rating from a brand-new account and a self-bookmark: neither counts.
  await prisma.rating.create({ data: { userId: fresh, episodeId: await firstEpisode("D-established"), value: 5 } });
  await prisma.bookmark.create({ data: { userId: est, episodeId: await firstEpisode("D-established") } });

  // The strong-taste reader: loves romance + Slow burn, is halfway through A.
  await prisma.bookmark.create({ data: { userId: taste, episodeId: await firstEpisode("D-established"), createdAt: ago(10) } });
  await prisma.rating.create({ data: { userId: taste, episodeId: await firstEpisode("E-established"), value: 5 } });
  await prisma.seriesFollow.create({ data: { userId: taste, seriesId: ids["F-established"] } });
  await prisma.readingProgress.create({ data: { userId: taste, episodeId: await firstEpisode("A-new"), percent: 50 } });

  await refreshAllStatsOnce();
  pool = await getFreshFeedPool();
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

const titleOf = (id: string) => pool.series.find((series) => series.id === id)?.title.replace(`${TAG} `, "") ?? id;
const describeFeed = (shelves: Awaited<ReturnType<typeof getFeed>>["shelves"]) =>
  shelves.map((shelf) => `  ${shelf.title}: ${shelf.cards.map((card) => titleOf(card.id)).join(", ")}`).join("\n");

describe("feed (scratch database)", () => {
  test("stats: no average under 3 ratings; new accounts and the author's own activity don't count", async () => {
    const d = await prisma.seriesStats.findUniqueOrThrow({ where: { seriesId: ids["D-established"] } });
    assert.equal(d.ratingCount, 2, "the brand-new account's rating is left out");
    assert.equal(d.bookmarkCount, 1, "the writer's own bookmark is left out");
    assert.equal(d.episodeCount, 8);
    const e = await prisma.seriesStats.findUniqueOrThrow({ where: { seriesId: ids["E-established"] } });
    assert.equal(e.ratingCount, 6);
    assert.equal(e.ratingSum, 30);
  });

  test("held series and banned writers are never eligible", () => {
    const poolIds = new Set(pool.series.map((series) => series.id));
    assert.ok(!poolIds.has(ids["H-held"]));
    assert.ok(!poolIds.has(ids["R-banned"]));
    for (const key of ["A-new", "B-new", "C3-prolific", "D-established", "E-established"]) assert.ok(poolIds.has(ids[key]), key);
  });

  test("a reader with no history: cold feed (New Writers, Just Updated), no personal shelves", async (t) => {
    const feed = await getFeed({ readerId: users.cold, sort: "trending", pool, from: 0, count: 20 });
    t.diagnostic(`Cold reader's feed:\n${describeFeed(feed.shelves)}`);
    const rules = feed.shelves.map((shelf) => shelf.rule);
    for (const personal of ["CONTINUE_READING", "BECAUSE_YOU_LIKED", "TRENDING_TOP_GENRE", "FOLLOWED_WRITERS"]) assert.ok(!rules.includes(personal as never), personal);
    assert.ok(rules.includes("NEW_WRITERS"), "New Writers is in every cold feed");
    assert.ok(rules.indexOf("NEW_WRITERS") < 4, "and in the first four");
    const all = feed.shelves.flatMap((shelf) => shelf.cards.map((card) => card.id));
    assert.equal(new Set(all).size, all.length, "no series twice");
    assert.ok(!all.includes(ids["H-held"]) && !all.includes(ids["R-banned"]));
  });

  test("New Writers: new writers only, one card per writer (the prolific writer's latest series)", async () => {
    const feed = await getFeed({ readerId: users.cold, sort: "newest", pool, from: 0, count: 20 });
    const shelf = feed.shelves.find((item) => item.rule === "NEW_WRITERS");
    assert.ok(shelf);
    const cards = shelf.cards.map((card) => card.id);
    assert.ok(!cards.includes(ids["D-established"]) && !cards.includes(ids["E-established"]) && !cards.includes(ids["F-established"]));
    const prolific = [ids["C1-prolific"], ids["C2-prolific"], ids["C3-prolific"]].filter((id) => cards.includes(id));
    assert.ok(prolific.length <= 1, "one card per writer");
    // Before repeats with the top row are removed, the prolific writer's card is their latest series.
    const breakdown = await getScoreBreakdown(ids["C3-prolific"]);
    assert.equal(breakdown!.shelves.find((item) => item.key === "new-writers")?.on, true);
    const older = await getScoreBreakdown(ids["C1-prolific"]);
    assert.match(older!.shelves.find((item) => item.key === "new-writers")!.reason, /one card per writer/);
  });

  test("a reader with a strong taste: Continue Reading and Because you liked first", async (t) => {
    const feed = await getFeed({ readerId: users.taste, sort: "trending", pool, from: 0, count: 20 });
    t.diagnostic(`Strong-taste reader's feed:\n${describeFeed(feed.shelves)}`);
    const rules = feed.shelves.map((shelf) => shelf.rule);
    assert.equal(rules[0], "CONTINUE_READING");
    assert.deepEqual(feed.shelves[0].cards.map((card) => card.id), [ids["A-new"]]);
    const liked = feed.shelves.find((shelf) => shelf.rule === "BECAUSE_YOU_LIKED");
    if (liked) {
      assert.equal(rules[1], "BECAUSE_YOU_LIKED");
      assert.match(liked.title, /Because you liked .*E-established/);
      assert.ok(!liked.cards.some((card) => card.id === ids["F-established"]), "already followed");
    } else {
      t.diagnostic("Because you liked hidden: under 4 similar series after removing the top row and repeats.");
    }
  });

  test("score breakdowns: an established series with 2 ratings, and the held series", async (t) => {
    const d = await getScoreBreakdown(ids["D-established"]);
    assert.ok(d);
    assert.equal(d.eligible, true);
    assert.equal(d.ratingAverage, null);
    assert.match(d.shelves.find((item) => item.key === "top-rated")!.reason, /has 2/);
    assert.equal(d.newWriter.isNew, false);
    t.diagnostic(
      `D-established: Trending ${d.trending?.total.toFixed(2)} (#${d.trendingRank} of ${d.poolSize}) = ` +
        Object.entries(d.trending ?? {})
          .filter(([key]) => key !== "total")
          .map(([key, value]) => `${key} ${(value as number).toFixed(2)}`)
          .join(", ") +
        `\n  ${d.shelves.map((item) => `${item.name}: ${item.reason}`).join("\n  ")}`,
    );
    const e = await getScoreBreakdown(ids["E-established"]);
    assert.ok(e && e.bayesian !== null && e.ratingAverage === 5);
    t.diagnostic(
      `E-established: Trending ${e.trending?.total.toFixed(2)} (#${e.trendingRank} of ${e.poolSize}); 6 ratings, average 5.00, adjusted ${e.bayesian.toFixed(2)}\n  ` +
        e.shelves.filter((item) => item.on || /Ranked/.test(item.reason)).map((item) => `${item.name}: ${item.reason}`).join("\n  "),
    );
    const h = await getScoreBreakdown(ids["H-held"]);
    assert.ok(h);
    assert.equal(h.eligible, false);
    assert.ok(h.reasons.some((reason) => /held/.test(reason)));
    t.diagnostic(`H-held: ${h.reasons.join(" ")}`);
  });

  test("holding a series removes it from the feed; releasing brings it back (audited)", async () => {
    const board = await makeUser("BOARD", "feed-board");
    assert.ok((await setSeriesModeration(board.id, ids["B-new"], "HELD", "fixture")).ok);
    assert.ok(!(await getFreshFeedPool()).series.some((series) => series.id === ids["B-new"]));
    assert.ok((await setSeriesModeration(board.id, ids["B-new"], "VISIBLE", "")).ok);
    assert.ok((await getFreshFeedPool()).series.some((series) => series.id === ids["B-new"]));
    assert.equal(await prisma.adminAuditLog.count({ where: { actorId: board.id, action: "SERIES_MODERATION_CHANGED" } }), 2);
  });

  test("a finished episode records when it was finished, once", async () => {
    const { saveProgress } = await import("@/lib/reading-progress");
    const episodeId = await firstEpisode("E-established");
    await saveProgress(users.taste, episodeId, 96);
    const first = await prisma.readingProgress.findUniqueOrThrow({ where: { userId_episodeId: { userId: users.taste, episodeId } } });
    assert.ok(first.finishedAt);
    await saveProgress(users.taste, episodeId, 100);
    const second = await prisma.readingProgress.findUniqueOrThrow({ where: { userId_episodeId: { userId: users.taste, episodeId } } });
    assert.equal(second.finishedAt?.getTime(), first.finishedAt.getTime());
  });
});

describe("feed over HTTP", () => {
  const requireServer = (t: { skip: (message: string) => void }) => {
    if (!reachable) t.skip(`dev server not reachable at ${BASE_URL}`);
    return reachable;
  };

  test("GET /api/feed pages the feed as JSON; a bad page is 400", async (t) => {
    if (!requireServer(t)) return;
    const cookie = await sessionCookie(users.taste);
    const response = await fetch(`${BASE_URL}/api/feed?sort=trending&from=0`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    const data = (await response.json()) as { shelves: unknown[]; next: number | null };
    assert.ok(Array.isArray(data.shelves));
    assert.equal((await fetch(`${BASE_URL}/api/feed?from=-1`)).status, 400);
    assert.equal((await fetch(`${BASE_URL}/api/feed?from=abc`)).status, 400);
  });

  test("Explore renders the feed for signed-out visitors", async (t) => {
    if (!requireServer(t)) return;
    const html = await (await fetch(`${BASE_URL}/explore`)).text();
    assert.match(html, />Trending now</);
  });

  test("exposure is counted at most once a day per visitor", async (t) => {
    if (!requireServer(t)) return;
    const first = await fetch(`${BASE_URL}/api/feed/exposure`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    assert.equal(first.status, 200);
    const cookie = (first.headers.get("set-cookie") ?? "").split(";")[0];
    assert.match(cookie, /^df-nw-seen=\d{4}-\d{2}-\d{2}$/);
    const second = await fetch(`${BASE_URL}/api/feed/exposure`, { method: "POST", headers: { Cookie: cookie } });
    assert.deepEqual(await second.json(), { counted: 0 });
  });

  test("feed admin routes: 401 signed out, 403 for readers, allowed for Board", async (t) => {
    if (!requireServer(t)) return;
    assert.equal((await fetch(`${BASE_URL}/api/admin/feed/refresh`, { method: "POST" })).status, 401);
    const readerCookie = await sessionCookie(users.cold);
    assert.equal((await fetch(`${BASE_URL}/api/admin/feed/refresh`, { method: "POST", headers: { Cookie: readerCookie } })).status, 403);
    const board = await makeUser("BOARD", "feed-board-http");
    const boardCookie = await sessionCookie(board.id);
    const refresh = await fetch(`${BASE_URL}/api/admin/feed/refresh`, { method: "POST", headers: { Cookie: boardCookie } });
    assert.equal(refresh.status, 200);
    const shelf = await prisma.feedShelf.findUniqueOrThrow({ where: { key: "hidden-gems" } });
    const bad = await fetch(`${BASE_URL}/api/admin/feed/shelves/${shelf.id}`, {
      method: "PATCH",
      headers: { Cookie: boardCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ tags: ["Not a real tag"] }),
    });
    assert.equal(bad.status, 400);
    const builtIn = await fetch(`${BASE_URL}/api/admin/feed/shelves/${shelf.id}`, { method: "DELETE", headers: { Cookie: boardCookie } });
    assert.equal(builtIn.status, 400, "built-in shelves can't be deleted");
    const page = await fetch(`${BASE_URL}/administration/feed/series/${ids["D-established"]}`, { headers: { Cookie: boardCookie } });
    assert.match(await page.text(), /Trending, term by term/);
  });

  test("the cron route refuses requests without the secret", async (t) => {
    if (!requireServer(t)) return;
    const response = await fetch(`${BASE_URL}/api/cron/feed-refresh`);
    assert.ok([401, 503].includes(response.status));
  });
});
