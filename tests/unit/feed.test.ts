/*
 * Sweep C: the feed's pure rules (scores, taste, shelves, composer) and the
 * structure of its routes. Database behaviour is in tests/integration/feed.test.ts.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
  FEED_RULES,
  NEW_SERIES_BOOST,
  NEW_SERIES_BOOST_DAYS,
  NEW_WRITERS_MAX_POSITION,
  NEW_WRITER_DAYS,
  NEW_WRITER_MAX_EPISODES,
  STALENESS_CAP,
  TASTE_HALF_LIFE_DAYS,
  TASTE_WEIGHTS,
  TRENDING_RATING_BONUS,
  TRENDING_WEIGHTS,
} from "@/lib/feed/config";
import { composeFeed, feedSeed, hashSeed, orderShelves, seededRandom } from "@/lib/feed/composer";
import { ineligibleReasons } from "@/lib/feed/eligibility";
import { bayesianRating, isHiddenGem, ratingAverage, trendingBreakdown, trendingScore } from "@/lib/feed/scoring";
import { checkFilter, checkShelfEdit, checkStaffPicks } from "@/lib/feed/shelf-rules";
import { explainShelf, isNewWriter, makeTrendingMap, shelfCandidates, type ShelfContext } from "@/lib/feed/shelves";
import { buildTasteProfile, decay, pickAnchor } from "@/lib/feed/taste";
import type { PoolSeries, PoolWriter, ReaderSignals, ShelfConfig } from "@/lib/feed/types";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 20, 12);
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

function series(id: string, patch: Partial<PoolSeries> = {}): PoolSeries {
  return {
    id,
    title: `Series ${id}`,
    description: "",
    coverImage: null,
    themeColor: null,
    genre: "romance",
    tags: [],
    authorId: `author-${id}`,
    authorName: `Writer ${id}`,
    isComplete: false,
    completedAt: null,
    episodeCount: 3,
    totalReadMinutes: 30,
    firstPublishedAt: now - 60 * DAY,
    lastPublishedAt: now - 2 * DAY,
    createdAt: now - 70 * DAY,
    ratingCount: 0,
    ratingSum: 0,
    bookmarkCount: 0,
    followCount: 0,
    readsTotal: 0,
    reads7d: 0,
    completions7d: 0,
    newBookmarks7d: 0,
    newFollows7d: 0,
    newRatings7d: 0,
    isMature: false,
    ...patch,
  };
}

function shelf(rule: ShelfConfig["rule"], patch: Partial<ShelfConfig> = {}): ShelfConfig {
  return {
    id: `shelf-${rule}-${patch.key ?? ""}`,
    key: patch.key ?? rule.toLowerCase(),
    name: rule,
    tier: "BIG",
    rule,
    genres: [],
    tags: [],
    weight: 1,
    minItems: 1,
    maxItems: 12,
    enabled: true,
    sortOrder: 0,
    builtIn: true,
    months: [],
    items: [],
    ...patch,
  };
}

function context(pool: PoolSeries[], options: { writers?: PoolWriter[]; signals?: ReaderSignals | null } = {}): ShelfContext {
  const signals = options.signals ?? null;
  const taste = buildTasteProfile(signals, now);
  const eligible = new Set(pool.map((item) => item.id));
  return {
    pool,
    writers: new Map((options.writers ?? []).map((writer) => [writer.authorId, writer])),
    now,
    signals,
    taste,
    anchorId: pickAnchor(signals, (id) => eligible.has(id), now),
    trending: makeTrendingMap(pool, now),
  };
}

function signals(patch: Partial<ReaderSignals> = {}): ReaderSignals {
  return { readerId: "reader", ratings: [], bookmarks: [], follows: [], finished: [], progress: [], followedAuthors: [], seriesMeta: {}, ...patch };
}

describe("Trending", () => {
  test("each activity is damped with sqrt and weighted", () => {
    const base = series("a", { lastPublishedAt: now, firstPublishedAt: now - 100 * DAY });
    const parts = trendingBreakdown({ ...base, newBookmarks7d: 4, newFollows7d: 9, completions7d: 16, reads7d: 25, newRatings7d: 1 }, now);
    assert.equal(parts.newBookmarks, TRENDING_WEIGHTS.newBookmarks * 2);
    assert.equal(parts.newFollows, TRENDING_WEIGHTS.newFollows * 3);
    assert.equal(parts.completions, TRENDING_WEIGHTS.completions * 4);
    assert.equal(parts.reads, TRENDING_WEIGHTS.reads * 5);
    assert.equal(parts.newRatings, TRENDING_WEIGHTS.newRatings * 1);
    // One burst can't dominate: 100x the reads is only 10x the points.
    assert.equal(trendingBreakdown({ ...base, reads7d: 100 }, now).reads, 10 * trendingBreakdown({ ...base, reads7d: 1 }, now).reads);
  });

  test("rating bonus only with 3+ ratings, scaled from 3.0 to 5.0", () => {
    assert.equal(trendingBreakdown(series("a", { ratingCount: 2, ratingSum: 10 }), now).ratingBonus, 0);
    assert.equal(trendingBreakdown(series("a", { ratingCount: 3, ratingSum: 15 }), now).ratingBonus, TRENDING_RATING_BONUS);
    assert.equal(trendingBreakdown(series("a", { ratingCount: 4, ratingSum: 16 }), now).ratingBonus, TRENDING_RATING_BONUS / 2);
    assert.equal(trendingBreakdown(series("a", { ratingCount: 3, ratingSum: 6 }), now).ratingBonus, 0);
  });

  test("new series boost fades to 0 over 14 days; staleness is capped", () => {
    assert.equal(trendingBreakdown(series("a", { firstPublishedAt: now }), now).newSeriesBoost, NEW_SERIES_BOOST);
    assert.equal(trendingBreakdown(series("a", { firstPublishedAt: now - (NEW_SERIES_BOOST_DAYS / 2) * DAY }), now).newSeriesBoost, NEW_SERIES_BOOST / 2);
    assert.equal(trendingBreakdown(series("a", { firstPublishedAt: now - 20 * DAY }), now).newSeriesBoost, 0);
    assert.equal(trendingBreakdown(series("a", { lastPublishedAt: now - 2 * DAY }), now).staleness, -1);
    assert.equal(trendingBreakdown(series("a", { lastPublishedAt: now - 300 * DAY }), now).staleness, -STALENESS_CAP);
    const parts = trendingBreakdown(series("a", { reads7d: 4 }), now);
    assert.equal(parts.total, trendingScore(series("a", { reads7d: 4 }), now));
  });
});

describe("ratings", () => {
  test("Top Rated: 3 ratings of 5.0 rank below 100 ratings of 4.8", () => {
    const few = series("few", { ratingCount: 3, ratingSum: 15 });
    const many = series("many", { ratingCount: 100, ratingSum: 480 });
    assert.ok(bayesianRating(many)! > bayesianRating(few)!);
    assert.equal(bayesianRating(series("two", { ratingCount: 2, ratingSum: 10 })), null);
    assert.equal(ratingAverage(series("two", { ratingCount: 2, ratingSum: 10 })), null, "averages hide under 3 ratings");
  });

  test("Hidden Gems: 4.3+ with few reads", () => {
    assert.ok(isHiddenGem(series("a", { ratingCount: 3, ratingSum: 13, readsTotal: 10 })));
    assert.ok(!isHiddenGem(series("b", { ratingCount: 3, ratingSum: 12, readsTotal: 10 })), "4.0 is below 4.3");
    assert.ok(!isHiddenGem(series("c", { ratingCount: 3, ratingSum: 15, readsTotal: 5000 })), "too many reads");
    assert.ok(!isHiddenGem(series("d", { ratingCount: 2, ratingSum: 10, readsTotal: 1 })), "under 3 ratings");
  });
});

describe("taste profile", () => {
  test("signals are weighted and halve every 30 days", () => {
    assert.equal(decay(now, now), 1);
    assert.ok(Math.abs(decay(now - TASTE_HALF_LIFE_DAYS * DAY, now) - 0.5) < 1e-9);
    const profile = buildTasteProfile(
      signals({
        ratings: [{ seriesId: "s1", value: 5, at: now }],
        bookmarks: [{ seriesId: "s2", at: now - TASTE_HALF_LIFE_DAYS * DAY }],
        seriesMeta: { s1: { genre: "romance", tags: ["Slow burn"], title: "One" }, s2: { genre: "romance", tags: [], title: "Two" } },
      }),
      now,
    );
    assert.ok(Math.abs(profile.genres.romance - (TASTE_WEIGHTS.rated4or5 + TASTE_WEIGHTS.bookmark / 2)) < 1e-9);
    assert.equal(profile.tags["Slow burn"], TASTE_WEIGHTS.rated4or5);
    assert.equal(profile.topGenre, "romance");
    assert.ok(profile.hasTaste);
  });

  test("1-2 star ratings count against; no history is a cold start", () => {
    const profile = buildTasteProfile(
      signals({ ratings: [{ seriesId: "s1", value: 1, at: now }], seriesMeta: { s1: { genre: "horror", tags: [], title: "x" } } }),
      now,
    );
    assert.equal(profile.genres.horror, TASTE_WEIGHTS.rated1or2);
    assert.equal(profile.hasTaste, false);
    assert.equal(buildTasteProfile(null, now).hasTaste, false);
  });

  test("finished episodes count at most 5 per series", () => {
    const finished = Array.from({ length: 12 }, () => ({ seriesId: "s1", at: now }));
    const profile = buildTasteProfile(signals({ finished, seriesMeta: { s1: { genre: "fantasy", tags: [], title: "x" } } }), now);
    assert.equal(profile.genres.fantasy, 5 * TASTE_WEIGHTS.finishedEpisode);
  });
});

describe("New Writers", () => {
  const writer = (authorId: string, publishedEpisodes: number, firstDaysAgo: number, exposure7d = 0): PoolWriter => ({
    authorId,
    publishedEpisodes,
    firstPublishedAt: now - firstDaysAgo * DAY,
    exposure7d,
  });

  test("new while under 5 episodes OR first published within 60 days", () => {
    assert.ok(isNewWriter(writer("a", 1, 400), now), "few episodes");
    assert.ok(isNewWriter(writer("b", 30, 10), now), "recent start");
    assert.ok(!isNewWriter(writer("c", NEW_WRITER_MAX_EPISODES, NEW_WRITER_DAYS + 1), now), "neither");
  });

  test("one card per writer (their latest series), least shown first, ties by latest publish", () => {
    const pool = [
      series("w1-old", { authorId: "w1", lastPublishedAt: now - 9 * DAY }),
      series("w1-new", { authorId: "w1", lastPublishedAt: now - 1 * DAY }),
      series("w2", { authorId: "w2", lastPublishedAt: now - 3 * DAY }),
      series("w3", { authorId: "w3", lastPublishedAt: now - 2 * DAY }),
      series("vet", { authorId: "vet" }),
    ];
    const writers = [writer("w1", 10, 5, 7), writer("w2", 2, 100, 0), writer("w3", 2, 100, 0), writer("vet", 40, 400, 0)];
    const ids = shelfCandidates(shelf("NEW_WRITERS"), context(pool, { writers })).items.map((item) => item.id);
    assert.deepEqual(ids, ["w3", "w2", "w1-new"]);
  });
});

describe("shelves", () => {
  test("Continue Reading: unfinished or with a next episode, most recent first", () => {
    const pool = [series("a"), series("b"), series("c")];
    const reader = signals({
      progress: [
        { seriesId: "a", episodeNumber: 2, percent: 40, at: now - 2 * DAY, lastEpisodeNumber: 3 },
        { seriesId: "b", episodeNumber: 3, percent: 100, at: now - 1 * DAY, lastEpisodeNumber: 3 },
        { seriesId: "c", episodeNumber: 1, percent: 100, at: now, lastEpisodeNumber: 3 },
      ],
    });
    assert.deepEqual(shelfCandidates(shelf("CONTINUE_READING"), context(pool, { signals: reader })).items.map((item) => item.id), ["c", "a"]);
  });

  test("Because you liked: same genre and shared tags, without what they already read, rated or follow", () => {
    const anchor = series("anchor", { genre: "romance", tags: ["Slow burn", "Small town"] });
    const pool = [
      anchor,
      series("both", { genre: "romance", tags: ["Slow burn", "Small town"] }),
      series("genre", { genre: "romance" }),
      series("tag", { genre: "horror", tags: ["Small town"] }),
      series("none", { genre: "horror" }),
      series("followed", { genre: "romance", tags: ["Slow burn"] }),
      series("rated", { genre: "romance", tags: ["Slow burn"] }),
    ];
    const reader = signals({
      ratings: [
        { seriesId: "anchor", value: 5, at: now - DAY },
        { seriesId: "rated", value: 3, at: now - 90 * DAY },
      ],
      follows: [{ seriesId: "followed", at: now - 100 * DAY }],
      seriesMeta: { anchor: { genre: "romance", tags: ["Slow burn", "Small town"], title: anchor.title } },
    });
    const result = shelfCandidates(shelf("BECAUSE_YOU_LIKED", { name: "Because you liked" }), context(pool, { signals: reader }));
    assert.equal(result.title, `Because you liked ${anchor.title}`);
    assert.deepEqual(result.items.map((item) => item.id), ["both", "genre", "tag"]);
  });

  test("personal shelves are empty without real data", () => {
    const ctx = context([series("a")]);
    for (const rule of ["CONTINUE_READING", "BECAUSE_YOU_LIKED", "TRENDING_TOP_GENRE", "FOLLOWED_WRITERS"] as const) {
      assert.equal(shelfCandidates(shelf(rule), ctx).items.length, 0, rule);
    }
  });

  test("tag shelves match any listed tag within the genres", () => {
    const pool = [series("a", { genre: "mystery", tags: ["Cosy"] }), series("b", { genre: "romance", tags: ["Cosy"] }), series("c", { genre: "mystery" })];
    const cozy = shelf("TAGS", { genres: ["mystery"], tags: ["Cosy"] });
    assert.deepEqual(shelfCandidates(cozy, context(pool)).items.map((item) => item.id), ["a"]);
  });

  test("Top Rated needs 3 ratings, and the breakdown says so", () => {
    const pool = [series("rated", { ratingCount: 5, ratingSum: 23 }), series("two", { ratingCount: 2, ratingSum: 10 })];
    const ctx = context(pool);
    const top = shelf("TOP_RATED", { minItems: 1 });
    assert.deepEqual(shelfCandidates(top, ctx).items.map((item) => item.id), ["rated"]);
    assert.match(explainShelf(pool[1], top, ctx).reason, /at least 3 ratings \(has 2\)/);
    assert.equal(explainShelf(pool[0], top, ctx).on, true);
  });
});

describe("composer", () => {
  const pool = Array.from({ length: 60 }, (_, index) =>
    series(`s${index}`, {
      authorId: `a${index % 30}`,
      genre: ["romance", "fantasy", "horror"][index % 3],
      reads7d: index,
      isComplete: index % 2 === 0,
      lastPublishedAt: now - (index % 10) * DAY,
    }),
  );
  const shelves = [
    shelf("NEW_WRITERS", { weight: 10 }),
    shelf("TRENDING", { weight: 8 }),
    shelf("JUST_UPDATED", { weight: 7 }),
    shelf("COMPLETED", { weight: 6 }),
    shelf("TOP_RATED", { weight: 6 }),
    shelf("TRENDING_GENRE", { key: "romance", genres: ["romance"], weight: 3 }),
    shelf("TRENDING_GENRE", { key: "fantasy", genres: ["fantasy"], weight: 3 }),
    shelf("TRENDING_GENRE", { key: "horror", genres: ["horror"], weight: 3 }),
    shelf("QUICK_READS", { weight: 1.5 }),
  ];
  const writers = Array.from({ length: 30 }, (_, index) => ({ authorId: `a${index}`, publishedEpisodes: index < 10 ? 2 : 40, firstPublishedAt: now - 400 * DAY, exposure7d: 0 }));

  test("the same reader and day always get the same feed; the order changes across days", () => {
    const ctx = context(pool, { writers });
    const first = composeFeed({ shelves, ctx, seed: feedSeed("r1", now), now }).map((item) => item.key);
    const again = composeFeed({ shelves, ctx, seed: feedSeed("r1", now), now }).map((item) => item.key);
    assert.deepEqual(first, again);
    const days = new Set(Array.from({ length: 10 }, (_, day) => composeFeed({ shelves, ctx, seed: feedSeed("r1", now + day * DAY), now }).map((item) => item.key).join()));
    assert.ok(days.size > 1, "shelves cycle from day to day");
  });

  test("no series twice on a screen, at most one card per writer per shelf, top row excluded", () => {
    const ctx = context(pool, { writers });
    const topRow = ["s59", "s58", "s57"];
    const feed = composeFeed({ shelves, ctx, seed: "x", now, alreadyShown: topRow });
    const ids = feed.flatMap((item) => item.cards.map((card) => card.id));
    assert.equal(new Set(ids).size, ids.length);
    for (const id of topRow) assert.ok(!ids.includes(id));
    for (const item of feed) {
      const authors = item.cards.map((card) => pool.find((entry) => entry.id === card.id)!.authorId);
      assert.equal(new Set(authors).size, authors.length, item.key);
    }
  });

  test("New Writers keeps its series even when a broad shelf is shown above it", () => {
    const small = [
      series("n1", { authorId: "n1" }),
      series("n2", { authorId: "n2" }),
      series("n3", { authorId: "n3" }),
      series("n4", { authorId: "n4" }),
    ];
    const newbies = small.map((item) => ({ authorId: item.authorId, publishedEpisodes: 1, firstPublishedAt: now - 5 * DAY, exposure7d: 0 }));
    const ctx = context(small, { writers: newbies });
    for (let day = 0; day < 20; day++) {
      const feed = composeFeed({
        shelves: [shelf("JUST_UPDATED", { weight: 7, minItems: 1 }), shelf("NEW_WRITERS", { weight: 10, minItems: 4 })],
        ctx,
        seed: feedSeed(null, now + day * DAY),
        now,
      });
      const newWriters = feed.find((item) => item.rule === "NEW_WRITERS");
      assert.equal(newWriters?.cards.length, 4, `day ${day}`);
    }
  });

  test("a shelf under its minimum is hidden", () => {
    const ctx = context(pool, { writers });
    const feed = composeFeed({ shelves: [shelf("TOP_RATED", { minItems: 4 })], ctx, seed: "x", now });
    assert.equal(feed.length, 0, "nobody has 3 ratings");
  });

  test("New Writers: about 75% of reader-days for readers with taste, always in the first 4, always in a cold feed", () => {
    let shown = 0;
    const runs = 10_000;
    for (let index = 0; index < runs; index++) {
      const order = orderShelves({ shelves, seed: `reader-${index}:2026-10-20`, hasTaste: true });
      const position = order.findIndex((item) => item.rule === "NEW_WRITERS");
      if (position >= 0) {
        shown += 1;
        assert.ok(position < NEW_WRITERS_MAX_POSITION, `position ${position}`);
      }
    }
    const rate = shown / runs;
    assert.ok(rate >= 0.7 && rate <= 0.8, `rate ${rate}`);
    for (let index = 0; index < 200; index++) {
      const order = orderShelves({ shelves, seed: `cold-${index}`, hasTaste: false });
      assert.ok(order.findIndex((item) => item.rule === "NEW_WRITERS") < NEW_WRITERS_MAX_POSITION);
      assert.ok(order.some((item) => item.rule === "JUST_UPDATED"));
    }
  });

  test("leading personal shelves come first; switched-off, skipped and out-of-season shelves never appear", () => {
    const order = orderShelves({
      shelves: [...shelves, shelf("CONTINUE_READING", { weight: 1 }), shelf("BECAUSE_YOU_LIKED", { weight: 1 }), shelf("HIDDEN_GEMS", { enabled: false })],
      seed: "s",
      hasTaste: true,
      skipRules: ["TRENDING"],
    });
    assert.deepEqual(order.slice(0, 2).map((item) => item.rule), ["CONTINUE_READING", "BECAUSE_YOU_LIKED"]);
    assert.ok(!order.some((item) => item.rule === "TRENDING" || item.rule === "HIDDEN_GEMS"));
    const october = composeFeed({ shelves: [shelf("COMPLETED", { months: [1] })], ctx: context(pool, { writers }), seed: "s", now });
    assert.equal(october.length, 0, "January-only shelf is hidden in October");
  });

  test("seeded random numbers are deterministic and spread out", () => {
    const a = seededRandom(hashSeed("seed"));
    const b = seededRandom(hashSeed("seed"));
    const values = Array.from({ length: 1000 }, () => a());
    assert.deepEqual(values.slice(0, 5), Array.from({ length: 5 }, () => b()));
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    assert.ok(mean > 0.45 && mean < 0.55);
  });
});

describe("eligibility and admin rules", () => {
  test("reasons name every failed rule", () => {
    assert.deepEqual(ineligibleReasons({ status: "PUBLISHED", moderationStatus: "VISIBLE", publishedEpisodes: 2, authorRestricted: false }), []);
    const reasons = ineligibleReasons({ status: "DRAFT", moderationStatus: "HELD", publishedEpisodes: 0, authorRestricted: true });
    assert.equal(reasons.length, 4);
  });

  test("shelf edits are bounded and tags come only from the fixed list", () => {
    assert.ok(checkShelfEdit({ weight: 5, minItems: 2, maxItems: 10 }, { rule: "TRENDING", minItems: 4, maxItems: 12 }).ok);
    assert.ok(!checkShelfEdit({ minItems: 10, maxItems: 4 }, { rule: "TRENDING", minItems: 4, maxItems: 12 }).ok);
    assert.ok(!checkShelfEdit({ weight: -1 }, { rule: "TRENDING", minItems: 4, maxItems: 12 }).ok);
    assert.ok(!checkShelfEdit({ tags: ["Slow burn"] }, { rule: "TRENDING", minItems: 4, maxItems: 12 }).ok, "no filter on Trending");
    assert.ok(!checkFilter([], ["Vampire romance"]).ok, "free text tag refused");
    assert.ok(!checkFilter(["westerns"], []).ok, "unknown genre refused");
    const ok = checkFilter(["Romance"], ["slow burn"]);
    assert.ok(ok.ok && ok.value.tags[0] === "Slow burn" && ok.value.genres[0] === "romance", "canonical spelling");
    assert.ok(!checkStaffPicks(["a", "a"]).ok);
  });

  test("every rule has a shelf implementation", () => {
    const source = read("lib/feed/shelves.ts");
    for (const rule of FEED_RULES) assert.match(source, new RegExp(`case "${rule}"`), rule);
  });
});

describe("routes", () => {
  test("the feed routes are public JSON routes that respect Renovation Mode", () => {
    for (const route of ["app/api/feed/route.ts", "app/api/feed/exposure/route.ts"]) {
      const source = read(route);
      assert.match(source, /await requirePlatformOpen\(\)[\s\S]*?if \(!guard\.ok\) return guard\.response/, route);
      assert.doesNotMatch(source, /redirect\(/, route);
      assert.doesNotMatch(source, /searchParams\.get\("(reader|user)/, route);
    }
  });

  test("the cron route fails closed without a secret and compares it in constant time", () => {
    const source = read("app/api/cron/feed-refresh/route.ts");
    assert.match(source, /CRON_SECRET/);
    assert.match(source, /timingSafeEqual/);
    assert.match(source, /status: 503/);
    assert.match(read("vercel.json"), /\/api\/cron\/feed-refresh/);
  });

  test("rating and bookmark changes are rate-limited", () => {
    assert.match(read("app/api/me/ratings/[episodeId]/route.ts"), /takeRateLimit\(guard\.user\.id, "rating", RATING_RATE_LIMITS\)/);
    assert.match(read("app/api/me/bookmarks/[episodeId]/route.ts"), /takeRateLimit\(guard\.user\.id, "bookmark", BOOKMARK_RATE_LIMITS\)/);
  });

  test("publishing refreshes the feed and keeps the first publish date", () => {
    const source = read("app/api/writer-studio/episodes/[episodeId]/publish/route.ts");
    assert.match(source, /refreshSeriesInFeed\(/);
    assert.match(source, /episode\.status === "PUBLISHED" && episode\.publishedAt \? episode\.publishedAt : new Date\(\)/);
  });

  test("Explore, the series page rows and the feed share one eligibility rule", () => {
    assert.match(read("lib/series-page.ts"), /return eligibleSeries\(\)/);
    assert.match(read("lib/feed/server.ts"), /WHERE \$\{eligibleSeries\(\)\}/);
    assert.match(read("lib/explore-catalogue.ts"), /getFeedPool/);
    assert.match(read("lib/feed/eligibility.ts"), /CONTENT RATING HOOK/);
    assert.match(read("lib/feed/config.ts"), /MATURE_FEED_CAP = 0\.25/);
  });
});
