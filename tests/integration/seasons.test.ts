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

async function api(path: string, method: string, body: unknown) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: { Cookie: writer.cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
