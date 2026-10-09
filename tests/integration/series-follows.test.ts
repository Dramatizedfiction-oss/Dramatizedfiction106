/*
 * Follow a series + Library, end to end over HTTP against the dev server (which
 * uses the .env.local scratch database). Test users and their series are tagged
 * and deleted afterwards (deleting a user cascades their series and follows).
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "@/lib/prisma";
import { BASE_URL, TAG, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

type Actor = { id: string; cookie: string };
let reader: Actor;
let writer: Actor;
let banned: Actor;
let published: string;
let draft: string;
let reachable = false;

async function actor(role: "READER" | "WRITER", label: string): Promise<Actor> {
  const user = await makeUser(role, label);
  return { id: user.id, cookie: await sessionCookie(user.id) };
}

function call(path: string, who: Actor | undefined, method = "GET") {
  return fetch(`${BASE_URL}${path}`, { method, redirect: "manual", headers: who ? { Cookie: who.cookie } : {} });
}

const followers = async (seriesId: string) =>
  (await prisma.series.findUniqueOrThrow({ where: { id: seriesId }, select: { followers: true } })).followers;

async function makeSeries(status: "PUBLISHED" | "DRAFT", label: string) {
  const series = await prisma.series.create({
    data: {
      title: `${TAG} ${label}`,
      description: "Integration test series.",
      genre: "drama",
      authorId: writer.id,
      aiUsageTag: "AI_FREE",
      status,
    },
    select: { id: true },
  });
  return series.id;
}

before(async () => {
  reachable = await serverReachable();
  reader = await actor("READER", "follow-reader");
  writer = await actor("WRITER", "follow-writer");
  banned = await actor("READER", "follow-banned");
  await prisma.memberRestriction.create({ data: { userId: banned.id, kind: "BAN", reason: `${TAG} test ban` } });
  published = await makeSeries("PUBLISHED", "followable");
  draft = await makeSeries("DRAFT", "draft");
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

function requireServer(t: { skip: (message: string) => void }) {
  if (!reachable) t.skip(`dev server not reachable at ${BASE_URL}`);
  return reachable;
}

describe("follow a series", () => {
  test("signed out, banned, and unpublished are refused with JSON", async (t) => {
    if (!requireServer(t)) return;
    const anon = await call(`/api/me/follows/${published}`, undefined, "PUT");
    assert.equal(anon.status, 401);
    assert.equal((await anon.json()).code, "UNAUTHENTICATED");

    const restricted = await call(`/api/me/follows/${published}`, banned, "PUT");
    assert.equal(restricted.status, 403);
    assert.equal((await restricted.json()).code, "ACCOUNT_RESTRICTED");

    for (const id of [draft, "does-not-exist"]) {
      const response = await call(`/api/me/follows/${id}`, reader, "PUT");
      assert.equal(response.status, 404, id);
    }
    assert.equal((await call("/api/me/follows", undefined)).status, 401);
    assert.equal(await followers(published), 0);
  });

  test("follow is idempotent and the count is exact (writers can follow their own series)", async (t) => {
    if (!requireServer(t)) return;
    for (let i = 0; i < 2; i++) {
      const response = await call(`/api/me/follows/${published}`, reader, "PUT");
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { following: true, followerCount: 1 });
    }
    assert.equal(await followers(published), 1, "Series.followers matches after a repeat follow");

    const own = await call(`/api/me/follows/${published}`, writer, "PUT");
    assert.deepEqual(await own.json(), { following: true, followerCount: 2 });
    assert.equal(await followers(published), 2);
  });

  test("the library lists followed, published series only, and only the caller's", async (t) => {
    if (!requireServer(t)) return;
    const library = await (await call("/api/me/follows", reader)).json();
    assert.deepEqual(library.series.map((s: { id: string }) => s.id), [published]);
    assert.equal(library.series[0].episodeCount, 0);

    // Unpublished: hidden from the library, follow kept; republished: back.
    await prisma.series.update({ where: { id: published }, data: { status: "DRAFT" } });
    assert.equal((await (await call("/api/me/follows", reader)).json()).series.length, 0);
    assert.equal(await prisma.seriesFollow.count({ where: { seriesId: published } }), 2);
    await prisma.series.update({ where: { id: published }, data: { status: "PUBLISHED" } });
    assert.equal((await (await call("/api/me/follows", reader)).json()).series.length, 1);
  });

  test("pages: series page shows Following + count; /reader shows the library", async (t) => {
    if (!requireServer(t)) return;
    const seriesPage = await (await call(`/series/${published}`, reader)).text();
    assert.match(seriesPage, /Following/);
    assert.match(seriesPage, /2(<!-- -->)? (<!-- -->)?followers/);
    assert.doesNotMatch(seriesPage, /Follow Author/);

    const readerPage = await (await call("/reader", reader)).text();
    assert.match(readerPage, new RegExp(`${TAG} followable`));

    const anonPage = await (await call(`/series/${published}`, undefined)).text();
    assert.match(anonPage, /Follow Series/);
  });

  test("unfollow is idempotent; deleting a member removes their follow and the count drops", async (t) => {
    if (!requireServer(t)) return;
    for (let i = 0; i < 2; i++) {
      const response = await call(`/api/me/follows/${published}`, writer, "DELETE");
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { following: false, followerCount: 1 });
    }
    assert.equal(await followers(published), 1);

    // Cascade: the reader's account is deleted; the trigger keeps the count right.
    await prisma.user.delete({ where: { id: reader.id } });
    assert.equal(await prisma.seriesFollow.count({ where: { seriesId: published } }), 0);
    assert.equal(await followers(published), 0);
  });
});
