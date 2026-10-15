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

describe("recommendation rows (Sweep A)", () => {
  test("Row 1 is the same genre when there is one; Row 2 is the author; never the current or unpublished series", async (t) => {
    if (!requireServer(t)) return;
    const page = await (await call(`/series/${main.id}`, undefined)).text();
    assert.match(page, /More in Mystery/);
    assert.match(page, new RegExp(`${TAG} same genre`));
    assert.match(page, /More by/);
    assert.match(page, new RegExp(`${TAG} same author`));
    assert.doesNotMatch(page, new RegExp(`${TAG} draft`), "unpublished series never appear");
    assert.match(page, /href="\/explore\?genre=mystery"/);
    assert.ok(page.indexOf("More in Mystery") < page.indexOf("More by"), "Row 1 comes before Row 2");
    assert.doesNotMatch(page, /Because you liked this|Like this one|More for you/, "one Row 1 only");
  });

  test("no other series in the genre: Like this one (shared tags), else More for you", async (t) => {
    if (!requireServer(t)) return;
    const lonely = await makeSeries(author, "lonely", `${TAG.toLowerCase()}-genre`, 1);
    const twin = await makeSeries(otherAuthor, "tag twin", "thriller", 1);
    // Tags no other series uses (the scratch copy may hold the test catalogue).
    await prisma.series.update({ where: { id: lonely.id }, data: { tags: ["Heist", "Sports"] } });
    await prisma.series.update({ where: { id: twin.id }, data: { tags: ["Sports"] } });

    const like = await (await call(`/series/${lonely.id}`, undefined)).text();
    assert.match(like, /Like this one/);
    const start = like.indexOf("Like this one");
    assert.match(like.slice(start, like.indexOf("</section>", start)), new RegExp(`${TAG} tag twin`));

    await prisma.series.update({ where: { id: twin.id }, data: { tags: [] } });
    const forYou = await (await call(`/series/${lonely.id}`, undefined)).text();
    assert.match(forYou, /More for you/);
    assert.doesNotMatch(forYou, /Like this one/);
  });
});

describe("sub tags (Sweep A)", () => {
  test("the writer picks up to 3 from the list; the series page shows them", async (t) => {
    if (!requireServer(t)) return;
    const path = `/api/writer-studio/series/${main.id}`;
    assert.equal((await call(path, author, "PATCH", { tags: ["Not a real tag"] })).status, 400);
    assert.equal((await call(path, author, "PATCH", { tags: ["Heist", "Ghosts", "Cosy", "Space"] })).status, 400);
    assert.equal((await call(path, otherAuthor, "PATCH", { tags: ["Heist"] })).status, 404, "only the author");
    assert.equal((await call(path, author, "PATCH", { tags: ["whodunit", "Detective"] })).status, 200);
    const saved = await prisma.series.findUniqueOrThrow({ where: { id: main.id }, select: { tags: true } });
    assert.deepEqual(saved.tags, ["Whodunit", "Detective"], "stored in the list's spelling");
    const page = await (await call(`/series/${main.id}`, undefined)).text();
    assert.match(page, /aria-label="Tags"/);
    assert.match(page, />Whodunit</);
  });
});

describe("episode order and Continue (Sweep A)", () => {
  test("episodes stay in order with the Continue badge in place; Continue follows the latest read", async (t) => {
    if (!requireServer(t)) return;
    // reader finished ep 1 earlier and is 30% into ep 2 (tests above): Continue episode 2.
    let page = await (await call(`/series/${main.id}`, reader)).text();
    const strip = page.slice(page.indexOf('id="episodes-heading"'));
    const one = strip.indexOf(`${TAG} main ep 1`);
    const two = strip.indexOf(`${TAG} main ep 2`);
    const three = strip.indexOf(`${TAG} main ep 3`);
    assert.ok(one > -1 && one < two && two < three, "episode 1 first, in order");
    assert.match(strip, /Continue/);

    // Finishing the last episode most recently: Read again (even though ep 2 is unfinished).
    await call(`/api/me/progress/${main.episodes[2]}`, reader, "PUT", { percent: 100 });
    page = await (await call(`/series/${main.id}`, reader)).text();
    assert.match(page, /Read again/);
  });
});

describe("explore", () => {
  test("Explore preselects ?genre=", async (t) => {
    if (!requireServer(t)) return;
    assert.equal((await call("/explore?genre=mystery", undefined)).status, 200);
  });
});