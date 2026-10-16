/*
 * Sweep B2: following writers, Library > People, followers on writer profiles
 * and the follow rate limit, end to end over HTTP against the dev server (the
 * .env.local scratch database). Test users are tagged and deleted afterwards
 * (deleting a user cascades their follows both ways and their rate-limit rows).
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "@/lib/prisma";
import { FOLLOW_RATE_LIMITS } from "@/lib/rate-limit-rules";
import { BASE_URL, TAG, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

type Actor = { id: string; cookie: string };
let listed: Actor; // reader who appears in follower lists
let hidden: Actor; // reader who doesn't (the default)
let writer: Actor; // the writer being followed
let otherWriter: Actor; // a writer following another writer
let banned: Actor;
let reachable = false;

async function actor(role: "READER" | "WRITER", label: string): Promise<Actor> {
  const user = await makeUser(role, label);
  return { id: user.id, cookie: await sessionCookie(user.id) };
}

function call(path: string, who: Actor | undefined, method = "GET", body?: unknown) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: { ...(who ? { Cookie: who.cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const follow = (who: Actor, authorId: string, method: "PUT" | "DELETE" = "PUT") => call(`/api/me/author-follows/${authorId}`, who, method);

before(async () => {
  reachable = await serverReachable();
  listed = await actor("READER", "af-listed");
  hidden = await actor("READER", "af-hidden");
  writer = await actor("WRITER", "af-writer");
  otherWriter = await actor("WRITER", "af-other-writer");
  banned = await actor("READER", "af-banned");
  await prisma.user.update({ where: { id: listed.id }, data: { followerListVisibility: "PUBLIC" } });
  await prisma.memberRestriction.create({ data: { userId: banned.id, kind: "BAN", reason: `${TAG} test ban` } });
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

function requireServer(t: { skip: (message: string) => void }) {
  if (!reachable) t.skip(`dev server not reachable at ${BASE_URL}`);
  return reachable;
}

describe("follow a writer", () => {
  test("signed out, restricted, self and non-writers are refused with JSON", async (t) => {
    if (!requireServer(t)) return;
    for (const method of ["PUT", "DELETE"]) {
      const anon = await call(`/api/me/author-follows/${writer.id}`, undefined, method);
      assert.equal(anon.status, 401);
      assert.equal((await anon.json()).code, "UNAUTHENTICATED");
    }
    assert.equal((await call("/api/me/author-follows", undefined)).status, 401);
    assert.equal((await call("/api/me/author-follows/import", undefined, "POST", { authorIds: [writer.id] })).status, 401);

    const restricted = await follow(banned, writer.id);
    assert.equal(restricted.status, 403);
    assert.equal((await restricted.json()).code, "ACCOUNT_RESTRICTED");

    const self = await follow(writer, writer.id);
    assert.equal(self.status, 400);
    assert.equal((await self.json()).code, "SELF");

    for (const id of [listed.id, "does-not-exist"]) {
      const response = await follow(hidden, id);
      assert.equal(response.status, 404, id);
    }
    assert.equal(await prisma.authorFollow.count({ where: { authorId: writer.id } }), 0);
  });

  test("the database itself refuses a self-follow", async () => {
    await assert.rejects(prisma.authorFollow.create({ data: { followerId: writer.id, authorId: writer.id } }));
  });

  test("follow is idempotent; writers can follow other writers; counts include everyone", async (t) => {
    if (!requireServer(t)) return;
    for (let i = 0; i < 2; i++) {
      const response = await follow(listed, writer.id);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { following: true, followerCount: 1 });
    }
    assert.deepEqual(await (await follow(hidden, writer.id)).json(), { following: true, followerCount: 2 });
    assert.deepEqual(await (await follow(otherWriter, writer.id)).json(), { following: true, followerCount: 3 });
  });

  test("Library > People lists only the caller's own follows", async (t) => {
    if (!requireServer(t)) return;
    const people = (await (await call("/api/me/author-follows", hidden)).json()).people as { id: string }[];
    assert.deepEqual(people.map((person) => person.id), [writer.id]);
    const none = (await (await call("/api/me/author-follows", writer)).json()).people;
    assert.deepEqual(none, []);

    // The writer's own reading profile shows who they follow (owner only).
    const shelf = await (await call(`/author/${otherWriter.id}?view=reading&shelf=people`, otherWriter)).text();
    assert.match(shelf, new RegExp(`${TAG} af-writer`));
  });

  test("the writer profile shows the count and only listed followers, never emails", async (t) => {
    if (!requireServer(t)) return;
    const page = await (await call(`/author/${writer.id}`, undefined)).text();
    assert.match(page, /3(<!-- -->)? (<!-- -->)?followers/);
    assert.match(page, new RegExp(`${TAG} af-listed`));
    assert.doesNotMatch(page, new RegExp(`${TAG} af-hidden`));
    assert.doesNotMatch(page, new RegExp(`${TAG} af-other-writer`));
    assert.doesNotMatch(page, /@example\.invalid/);

    const all = await (await call(`/author/${writer.id}/followers`, undefined)).text();
    assert.match(all, new RegExp(`${TAG} af-listed`));
    assert.doesNotMatch(all, new RegExp(`${TAG} af-hidden`));

    // A public writer profile never shows who that writer follows.
    const followerWriterPage = await (await call(`/author/${otherWriter.id}`, undefined)).text();
    assert.doesNotMatch(followerWriterPage, new RegExp(`${TAG} af-writer`));
  });

  test("the follow button: Following for a follower, none on your own profile", async (t) => {
    if (!requireServer(t)) return;
    const following = await (await call(`/author/${writer.id}`, listed)).text();
    assert.match(following, new RegExp(`Unfollow ${TAG} af-writer`));
    const own = await (await call(`/author/${writer.id}`, writer)).text();
    assert.doesNotMatch(own, new RegExp(`(Unfollow|Follow) ${TAG} af-writer`));
    const anon = await (await call(`/author/${writer.id}`, undefined)).text();
    assert.match(anon, new RegExp(`Follow ${TAG} af-writer`));
  });

  test("a member can opt in to follower lists through the profile route", async (t) => {
    if (!requireServer(t)) return;
    const response = await call("/api/me/profile", hidden, "PATCH", { followerListVisibility: "PUBLIC" });
    assert.equal(response.status, 200);
    const page = await (await call(`/author/${writer.id}`, undefined)).text();
    assert.match(page, new RegExp(`${TAG} af-hidden`));
    await call("/api/me/profile", hidden, "PATCH", { followerListVisibility: "PRIVATE" });
  });

  test("unfollow is idempotent", async (t) => {
    if (!requireServer(t)) return;
    for (let i = 0; i < 2; i++) {
      const response = await follow(otherWriter, writer.id, "DELETE");
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { following: false, followerCount: 2 });
    }
  });

  test("device import follows real writers only, never yourself", async (t) => {
    if (!requireServer(t)) return;
    const response = await call("/api/me/author-follows/import", otherWriter, "POST", {
      authorIds: [writer.id, otherWriter.id, listed.id, "nope", 42, writer.id],
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { imported: 1 });
    assert.equal(await prisma.authorFollow.count({ where: { followerId: otherWriter.id } }), 1);
    assert.equal((await call("/api/me/author-follows/import", otherWriter, "POST", { authorIds: "x" })).status, 200);
  });

  test("follow and unfollow are rate-limited (series and writers together)", async (t) => {
    if (!requireServer(t)) return;
    const limit = FOLLOW_RATE_LIMITS[0];
    await prisma.rateLimitHit.createMany({
      data: Array.from({ length: limit.max }, () => ({ userId: listed.id, action: "follow" })),
    });
    const author = await follow(listed, writer.id, "DELETE");
    assert.equal(author.status, 429);
    assert.equal((await author.json()).code, "RATE_LIMITED");
    const series = await call("/api/me/follows/anything", listed, "PUT");
    assert.equal(series.status, 429);
    assert.equal(await prisma.authorFollow.count({ where: { followerId: listed.id } }), 1, "nothing changed");
  });

  test("deleting an account removes its follows both ways", async (t) => {
    if (!requireServer(t)) return;
    await prisma.authorFollow.create({ data: { followerId: writer.id, authorId: otherWriter.id } });
    await prisma.user.delete({ where: { id: writer.id } });
    assert.equal(await prisma.authorFollow.count({ where: { OR: [{ followerId: writer.id }, { authorId: writer.id }] } }), 0);
    assert.equal(await prisma.authorFollow.count({ where: { followerId: { in: [listed.id, hidden.id] } } }), 0);
  });
});
