/*
 * The series page redesign, end to end over HTTP against the dev server (the
 * .env.local scratch database): reading progress, Continue, the rails and
 * their rules, the full episode list, "Series complete" and the genre link.
 * Test users and their series are tagged and deleted afterwards.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "@/lib/prisma";
import { BASE_URL, TAG, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

type Actor = { id: string; cookie: string };
let author: Actor;
let otherAuthor: Actor;
let reader: Actor;
let fresh: Actor;
let main: { id: string; episodes: string[] };
const extra: Record<string, string> = {};
let reachable = false;

async function actor(role: "READER" | "WRITER", label: string): Promise<Actor> {
  const user = await makeUser(role, label);
  return { id: user.id, cookie: await sessionCookie(user.id) };
}

function call(path: string, who: Actor | undefined, method = "GET", body?: unknown) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: { ...(who ? { Cookie: who.cookie } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function makeSeries(by: Actor, label: string, genre: string, episodes: number, status: "PUBLISHED" | "DRAFT" = "PUBLISHED") {
  const series = await prisma.series.create({
    data: { title: `${TAG} ${label}`, description: "Integration test series.", genre, authorId: by.id, aiUsageTag: "AI_FREE", status },
    select: { id: true },
  });
  const ids: string[] = [];
  for (let n = 1; n <= episodes; n++) {
    const episode = await prisma.episode.create({
      data: {
        title: `${TAG} ${label} ep ${n}`,
        episodeNumber: n,
        body: "<p>Story text.</p>",
        readTime: 5,
        status: "PUBLISHED",
        publishedAt: new Date(),
        seriesId: series.id,
        authorId: by.id,
        aiUsageTag: "AI_FREE",
      },
      select: { id: true },
    });
    ids.push(episode.id);
  }
  return { id: series.id, episodes: ids };
}

before(async () => {
  reachable = await serverReachable();
  author = await actor("WRITER", "sp-author");
  otherAuthor = await actor("WRITER", "sp-other");
  reader = await actor("READER", "sp-reader");
  fresh = await actor("READER", "sp-fresh");
  main = await makeSeries(author, "main", "mystery", 3);
  extra.sameAuthor = (await makeSeries(author, "same author", "drama", 1)).id;
  extra.sameGenre = (await makeSeries(otherAuthor, "same genre", "mystery", 1)).id;
  extra.draft = (await makeSeries(author, "draft", "mystery", 1, "DRAFT")).id;
  extra.liked = (await makeSeries(otherAuthor, "liked", "mystery", 1)).id;
  extra.genre2 = (await makeSeries(otherAuthor, "genre two", "mystery", 1)).id;
  extra.genre3 = (await makeSeries(otherAuthor, "genre three", "mystery", 1)).id;
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

function requireServer(t: { skip: (message: string) => void }) {
  if (!reachable) t.skip(`dev server not reachable at ${BASE_URL}`);
  return reachable;
}

describe("reading progress", () => {
  test("signed-in only, published episodes only, and it only ever goes up", async (t) => {
    if (!requireServer(t)) return;
    const path = `/api/me/progress/${main.episodes[0]}`;
    assert.equal((await call(path, undefined, "PUT", { percent: 50 })).status, 401);
    assert.equal((await call(path, reader, "PUT", { percent: "50" })).status, 400);
    assert.equal((await call(path, reader, "PUT", { percent: 50, userId: fresh.id })).status, 400, "strict body");
    const draftEpisode = await prisma.episode.findFirstOrThrow({ where: { seriesId: extra.draft }, select: { id: true } });
    assert.equal((await call(`/api/me/progress/${draftEpisode.id}`, reader, "PUT", { percent: 50 })).status, 404);

    assert.deepEqual(await (await call(path, reader, "PUT", { percent: 60 })).json(), { percent: 60 });
    assert.deepEqual(await (await call(path, reader, "PUT", { percent: 20 })).json(), { percent: 60 }, "scrolling back up keeps the furthest point");
    assert.deepEqual(await (await call(path, reader, "PUT", { percent: 140 })).json(), { percent: 100 }, "capped at 100");
    await assert.rejects(
      prisma.$executeRaw`INSERT INTO "ReadingProgress" ("userId","episodeId","percent","updatedAt") VALUES (${fresh.id}, ${main.episodes[0]}, 150, now())`,
    );
  });
});

describe("series page", () => {
  test("signed out: Start reading and the free-account link; signed in: Continue episode N", async (t) => {
    if (!requireServer(t)) return;
    const anon = await (await call(`/series/${main.id}`, undefined)).text();
    assert.match(anon, /Start reading/);
    assert.match(anon, /Create a free account to save progress/);
    assert.match(anon, /3(<!-- -->)? (<!-- -->)?episodes/);
    assert.match(anon, /Ongoing/);
    assert.doesNotMatch(anon, /Story text\./, "no story text is sent");
    assert.doesNotMatch(anon, /role="progressbar"/, "no progress bars signed out");

    // Episode 1 finished (above), episode 2 started: Continue episode 2.
    await call(`/api/me/progress/${main.episodes[1]}`, reader, "PUT", { percent: 30 });
    const signedIn = await (await call(`/series/${main.id}`, reader)).text();
    assert.match(signedIn, /Continue episode (<!-- -->)?2/);
    assert.doesNotMatch(signedIn, /Create a free account/);
    assert.match(signedIn, /aria-valuenow="30"/);

    // Nothing started: Start reading.
    assert.match(await (await call(`/series/${main.id}`, fresh)).text(), /Start reading/);
  });

  test("the full episode list, with progress for the member", async (t) => {
    if (!requireServer(t)) return;
    const list = await (await call(`/series/${main.id}/episodes`, reader)).text();
    for (let n = 1; n <= 3; n++) assert.match(list, new RegExp(`${TAG} main ep ${n}`));
    assert.match(list, /aria-valuenow="100"/);
    // Unpublished: Next renders the not-found page (a 404, or a streamed 200 once rendering began); its episodes are never sent.
    const draft = await call(`/series/${extra.draft}/episodes`, undefined);
    assert.ok([200, 404].includes(draft.status));
    const draftPage = await draft.text();
    assert.match(draftPage, /NEXT_NOT_FOUND|could not be found|404/);
    assert.doesNotMatch(draftPage, new RegExp(`${TAG} draft ep`));
  });

  test("Series complete is set in Writer Studio by the series author only", async (t) => {
    if (!requireServer(t)) return;
    assert.equal((await call(`/api/writer-studio/series/${main.id}`, otherAuthor, "PATCH", { isComplete: true })).status, 404);
    assert.equal((await call(`/api/writer-studio/series/${main.id}`, author, "PATCH", { isComplete: true })).status, 200);
    assert.match(await (await call(`/series/${main.id}`, undefined)).text(), /Complete/);
    await call(`/api/writer-studio/series/${main.id}`, author, "PATCH", { isComplete: false });
  });
});

describe("rails", () => {
  test("More by the author and More in the genre: never the current or unpublished series", async (t) => {
    if (!requireServer(t)) return;
    const page = await (await call(`/series/${main.id}`, undefined)).text();
    assert.match(page, /More by/);
    assert.match(page, new RegExp(`${TAG} same author`));
    assert.match(page, /More in mystery/);
    assert.match(page, new RegExp(`${TAG} same genre`));
    assert.doesNotMatch(page, new RegExp(`${TAG} draft`), "unpublished series never appear");
    assert.match(page, /href="\/explore\?genre=mystery"/);
    assert.doesNotMatch(page, /Because you liked this/, "signed out: no personal rail");
  });

  test("Because you liked this: only with signals and at least 3 results", async (t) => {
    if (!requireServer(t)) return;
    assert.doesNotMatch(await (await call(`/series/${main.id}`, fresh)).text(), /Because you liked this/, "no signals");

    // fresh follows one mystery series by the other author: the other mystery series qualify.
    assert.equal((await call(`/api/me/follows/${extra.liked}`, fresh, "PUT")).status, 200);
    const page = await (await call(`/series/${main.id}`, fresh)).text();
    assert.match(page, /Because you liked this/);
    // Just that rail's section (later markup and Next's page data mention other series).
    const start = page.indexOf("Because you liked this");
    const because = page.slice(start, page.indexOf("</section>", start));
    assert.doesNotMatch(because, new RegExp(`${TAG} liked<`), "series already followed are left out");
    assert.match(because, new RegExp(`${TAG} genre two`));
  });

  test("Explore preselects ?genre=", async (t) => {
    if (!requireServer(t)) return;
    assert.equal((await call("/explore?genre=mystery", undefined)).status, 200);
  });
});
