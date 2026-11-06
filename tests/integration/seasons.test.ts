/*
 * Sweep G, stage 1 (scratch database): seasons in the data. New series get
 * Season 1, new episodes go at the end of the latest season, the browser can't
 * set numbers, renumbering keeps both numbers whole, a season with episodes
 * can't be deleted, a series without seasons is repaired, and deleting an
 * account removes its seasons.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "@/lib/prisma";
import { moveEpisode, reorderSeasons } from "@/lib/season-rules";
import { changeSeasonLayout } from "@/lib/seasons";
import { BASE_URL, TAG, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

let reachable = false;
let writer: { id: string; cookie: string };

before(async () => {
  reachable = await serverReachable();
  const user = await makeUser("WRITER", "seasons");
  writer = { id: user.id, cookie: await sessionCookie(user.id) };
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

function requireServer(t: { skip: (message: string) => void }) {
  if (!reachable) t.skip(`dev server not reachable at ${BASE_URL}`);
  return reachable;
}

async function api(path: string, method: string, body?: unknown) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: { Cookie: writer.cookie, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, json: (await response.json().catch(() => null)) as Record<string, any> | null };
}

const numbering = async (seriesId: string) =>
  (
    await prisma.episode.findMany({
      where: { seriesId },
      orderBy: { episodeNumber: "asc" },
      select: { id: true, episodeNumber: true, seasonEpisodeNumber: true, season: { select: { number: true } } },
    })
  ).map((episode) => [episode.id, episode.episodeNumber, `S${episode.season?.number}E${episode.seasonEpisodeNumber}`]);

describe("seasons in the data", () => {
  let seriesId = "";
  const episodeIds: string[] = [];

  test("a new series starts with Season 1; new episodes fill it in order", async (t) => {
    if (!requireServer(t)) return;
    const series = await api("/api/writer-studio/series", "POST", { title: `${TAG} Seasons`, genre: "fantasy" });
    assert.equal(series.status, 200);
    seriesId = series.json!.series.id;
    const seasons = await prisma.season.findMany({ where: { seriesId } });
    assert.deepEqual(seasons.map((season) => season.number), [1]);

    for (let i = 0; i < 3; i += 1) {
      // A number from the browser is ignored.
      const created = await api("/api/writer-studio/episodes", "POST", { seriesId, title: `${TAG} ep${i + 1}`, episodeNumber: 40 });
      assert.equal(created.status, 200);
      episodeIds.push(created.json!.episode.id);
    }
    assert.deepEqual(
      (await numbering(seriesId)).map(([, n, code]) => [n, code]),
      [
        [1, "S1E1"],
        [2, "S1E2"],
        [3, "S1E3"],
      ],
    );
  });

  test("saving an episode can't change its number", async (t) => {
    if (!requireServer(t) || !seriesId) return;
    const saved = await api(`/api/writer-studio/episodes/${episodeIds[0]}`, "PATCH", { episodeNumber: 9, title: `${TAG} renamed` });
    assert.equal(saved.status, 200);
    const row = await prisma.episode.findUniqueOrThrow({ where: { id: episodeIds[0] }, select: { episodeNumber: true, title: true } });
    assert.deepEqual(row, { episodeNumber: 1, title: `${TAG} renamed` });
  });

  test("moving, adding and reordering keep both numbers whole", async (t) => {
    if (!requireServer(t) || !seriesId) return;
    const season2 = await prisma.season.create({ data: { seriesId, number: 2, title: "Two" } });

    // The last episode of Season 1 becomes the first of Season 2: reading order unchanged.
    const moved = await changeSeasonLayout(seriesId, (layout) => moveEpisode(layout, episodeIds[2], season2.id) ?? "BAD");
    assert.equal(moved.ok, true);
    assert.deepEqual((await numbering(seriesId)).map(([, n, code]) => [n, code]), [
      [1, "S1E1"],
      [2, "S1E2"],
      [3, "S2E1"],
    ]);

    // A new episode joins the latest season, at the end of the series.
    const created = await api("/api/writer-studio/episodes", "POST", { seriesId, title: `${TAG} ep4` });
    episodeIds.push(created.json!.episode.id);
    assert.deepEqual((await numbering(seriesId)).at(-1)!.slice(1), [4, "S2E2"]);

    const season1 = await prisma.season.findFirstOrThrow({ where: { seriesId, number: 1 } });
    const reordered = await changeSeasonLayout(seriesId, (layout) => reorderSeasons(layout, [season2.id, season1.id]) ?? "BAD");
    assert.equal(reordered.ok, true);
    assert.deepEqual((await numbering(seriesId)).map(([id, n, code]) => [id, n, code]), [
      [episodeIds[2], 1, "S1E1"],
      [episodeIds[3], 2, "S1E2"],
      [episodeIds[0], 3, "S2E1"],
      [episodeIds[1], 4, "S2E2"],
    ]);

    // A refusal writes nothing.
    const refused = await changeSeasonLayout(seriesId, () => "NOPE" as const);
    assert.deepEqual(refused, { ok: false, reason: "NOPE" });
    assert.equal((await numbering(seriesId))[0][1], 1);
  });

  test("the database refuses to delete a season that still has episodes", async (t) => {
    if (!requireServer(t) || !seriesId) return;
    const season = await prisma.season.findFirstOrThrow({ where: { seriesId, number: 1 } });
    await assert.rejects(prisma.season.delete({ where: { id: season.id } }));
    assert.equal(await prisma.episode.count({ where: { seriesId } }), 4);
  });
});

describe("season routes (stage 2)", () => {
  let seriesId = "";
  let season1 = "";
  let season2 = "";
  const ids: string[] = [];

  async function as(cookie: string | null, path: string, method: string, body?: unknown) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      redirect: "manual",
      headers: { ...(cookie ? { Cookie: cookie } : {}), "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let json: Record<string, any> | null = null;
    try {
      json = JSON.parse(text);
    } catch {
      // not JSON: the assertions below will say so
    }
    return { status: response.status, json };
  }

  test("setup: a series with three episodes", async (t) => {
    if (!requireServer(t)) return;
    const series = await api("/api/writer-studio/series", "POST", { title: `${TAG} Routes`, genre: "mystery" });
    seriesId = series.json!.series.id;
    season1 = (await prisma.season.findFirstOrThrow({ where: { seriesId } })).id;
    for (let i = 0; i < 3; i += 1) ids.push((await api("/api/writer-studio/episodes", "POST", { seriesId, title: `${TAG} r${i + 1}` })).json!.episode.id);
  });

  test("signed out 401, readers 403, other writers 404 — all JSON", async (t) => {
    if (!requireServer(t) || !seriesId) return;
    const reader = await makeUser("READER", "seasons-reader");
    const other = await makeUser("WRITER", "seasons-other");
    const readerCookie = await sessionCookie(reader.id);
    const otherCookie = await sessionCookie(other.id);
    const calls: [string, string, unknown][] = [
      [`/api/writer-studio/series/${seriesId}/seasons`, "POST", { title: "x" }],
      [`/api/writer-studio/series/${seriesId}/seasons/order`, "PUT", { seasonIds: [season1] }],
      [`/api/writer-studio/seasons/${season1}`, "PATCH", { title: "x" }],
      [`/api/writer-studio/seasons/${season1}`, "DELETE", undefined],
      [`/api/writer-studio/episodes/${ids[0]}/season`, "POST", { seasonId: season1 }],
    ];
    for (const [path, method, body] of calls) {
      const out = await as(null, path, method, body);
      assert.equal(out.status, 401, `${method} ${path} signed out`);
      assert.ok(out.json?.code, "JSON body");
      assert.equal((await as(readerCookie, path, method, body)).status, 403, `${method} ${path} reader`);
      const notOwner = await as(otherCookie, path, method, body);
      assert.equal(notOwner.status, 404, `${method} ${path} other writer`);
      assert.equal(notOwner.json?.code, "NOT_FOUND");
    }
    assert.equal(await prisma.season.count({ where: { seriesId } }), 1, "nothing changed");
  });

  test("add, rename, complete; titles are checked", async (t) => {
    if (!requireServer(t) || !seriesId) return;
    const added = await api(`/api/writer-studio/series/${seriesId}/seasons`, "POST", { title: "  The   Second ", description: "" });
    assert.equal(added.status, 200);
    season2 = added.json!.season.id;
    assert.deepEqual(
      await prisma.season.findUniqueOrThrow({ where: { id: season2 }, select: { number: true, title: true, description: true, status: true } }),
      { number: 2, title: "The Second", description: null, status: "ONGOING" },
    );
    assert.equal((await api(`/api/writer-studio/series/${seriesId}/seasons`, "POST", { title: "x".repeat(61) })).status, 400);

    const completed = await api(`/api/writer-studio/seasons/${season1}`, "PATCH", { status: "COMPLETE", title: "First" });
    assert.equal(completed.status, 200);
    const row = await prisma.season.findUniqueOrThrow({ where: { id: season1 } });
    assert.equal(row.status, "COMPLETE");
    assert.ok(row.completedAt);
    assert.equal((await prisma.series.findUniqueOrThrow({ where: { id: seriesId } })).isComplete, false, "the series is untouched");
    assert.equal((await api(`/api/writer-studio/seasons/${season1}`, "PATCH", { status: "DONE" })).status, 400);
  });

  test("move, create into a chosen season, reorder; refusals are 409 with a reason", async (t) => {
    if (!requireServer(t) || !season2) return;
    const moved = await api(`/api/writer-studio/episodes/${ids[2]}/season`, "POST", { seasonId: season2 });
    assert.equal(moved.status, 200);
    assert.equal(moved.json!.episode.season.number, 2);
    assert.equal(moved.json!.episode.seasonEpisodeNumber, 1);

    // A new episode into Season 1 lands at its end, before Season 2.
    const created = await api("/api/writer-studio/episodes", "POST", { seriesId, seasonId: season1, title: `${TAG} r4` });
    assert.equal(created.status, 200);
    ids.push(created.json!.episode.id);
    assert.deepEqual((await numbering(seriesId)).map(([id, n, code]) => [id, n, code]), [
      [ids[0], 1, "S1E1"],
      [ids[1], 2, "S1E2"],
      [ids[3], 3, "S1E3"],
      [ids[2], 4, "S2E1"],
    ]);

    // Another series' season is "not found", for creating and for moving.
    const elsewhere = await prisma.season.findFirstOrThrow({ where: { seriesId: { not: seriesId } }, select: { id: true } });
    assert.equal((await api("/api/writer-studio/episodes", "POST", { seriesId, seasonId: elsewhere.id })).status, 404);
    assert.equal((await api(`/api/writer-studio/episodes/${ids[0]}/season`, "POST", { seasonId: elsewhere.id })).status, 404);

    const badOrder = await api(`/api/writer-studio/series/${seriesId}/seasons/order`, "PUT", { seasonIds: [season2] });
    assert.deepEqual([badOrder.status, badOrder.json?.code], [409, "BAD_ORDER"]);
    const reordered = await api(`/api/writer-studio/series/${seriesId}/seasons/order`, "PUT", { seasonIds: [season2, season1] });
    assert.equal(reordered.status, 200);
    assert.equal((await numbering(seriesId))[0][0], ids[2], "Season 2's episode now opens the series");

    const notEmpty = await api(`/api/writer-studio/seasons/${season1}`, "DELETE");
    assert.deepEqual([notEmpty.status, notEmpty.json?.code], [409, "NOT_EMPTY"]);
  });

  test("an emptied season can be deleted; the last one can't", async (t) => {
    if (!requireServer(t) || !season2) return;
    // Season 2 (now first) holds one episode: move it out, then delete the empty season.
    assert.equal((await api(`/api/writer-studio/episodes/${ids[2]}/season`, "POST", { seasonId: season1 })).status, 200);
    assert.equal((await api(`/api/writer-studio/seasons/${season2}`, "DELETE")).status, 200);
    const left = await prisma.season.findMany({ where: { seriesId }, select: { id: true, number: true } });
    assert.deepEqual(left, [{ id: season1, number: 1 }], "the remaining season is renumbered to 1");
    assert.equal(await prisma.episode.count({ where: { seriesId } }), 4, "no episode was lost");

    const last = await api(`/api/writer-studio/seasons/${season1}`, "DELETE");
    assert.deepEqual([last.status, last.json?.code], [409, "LAST_SEASON"]);
  });
});

describe("older data", () => {
  test("a series made without seasons is repaired when it gets a new episode", async (t) => {
    if (!requireServer(t)) return;
    const series = await prisma.series.create({
      data: { title: `${TAG} Legacy`, description: "Test.", genre: "fantasy", authorId: writer.id, aiUsageTag: "AI_FREE" },
    });
    await prisma.episode.create({
      data: { title: `${TAG} old`, episodeNumber: 1, body: "<p>x</p>", readTime: 1, seriesId: series.id, authorId: writer.id, aiUsageTag: "AI_FREE" },
    });
    const created = await api("/api/writer-studio/episodes", "POST", { seriesId: series.id, title: `${TAG} new` });
    assert.equal(created.status, 200);
    assert.deepEqual((await numbering(series.id)).map(([, n, code]) => [n, code]), [
      [1, "S1E1"],
      [2, "S1E2"],
    ]);
  });

  test("deleting an account removes its series' seasons and episodes", async () => {
    const owner = await makeUser("WRITER", "seasons-gone");
    const series = await prisma.series.create({
      data: {
        title: `${TAG} Gone`,
        description: "Test.",
        genre: "fantasy",
        authorId: owner.id,
        aiUsageTag: "AI_FREE",
        seasons: { create: [{ number: 1 }, { number: 2 }] },
      },
      select: { id: true, seasons: { select: { id: true, number: true } } },
    });
    await prisma.episode.create({
      data: {
        title: `${TAG} gone`,
        episodeNumber: 1,
        seasonId: series.seasons.find((season) => season.number === 2)!.id,
        seasonEpisodeNumber: 1,
        body: "<p>x</p>",
        readTime: 1,
        seriesId: series.id,
        authorId: owner.id,
        aiUsageTag: "AI_FREE",
      },
    });
    await prisma.user.delete({ where: { id: owner.id } });
    assert.equal(await prisma.season.count({ where: { seriesId: series.id } }), 0);
    assert.equal(await prisma.episode.count({ where: { seriesId: series.id } }), 0);
  });
});
