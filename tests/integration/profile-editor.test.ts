/*
 * Profile editor (sweep 6), end to end over HTTP against the dev server on the
 * .env.local scratch database: avatar library, picture rules, visibility, the
 * public reading profile, and Settings no longer editing the profile.
 * Everything created is tagged and removed afterwards.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { removePlatformAvatar } from "@/lib/admin/avatars-service";
import { prisma } from "@/lib/prisma";
import { BASE_URL, TAG, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

type Actor = { id: string; cookie: string };
let owner: Actor;
let visitor: Actor;
let board: Actor;
let avatar: { id: string; url: string };
let seriesId: string;
let reachable = false;

async function actor(role: "READER" | "WRITER" | "BOARD", label: string): Promise<Actor> {
  const user = await makeUser(role, label);
  return { id: user.id, cookie: await sessionCookie(user.id) };
}

function call(path: string, who?: Actor, init: RequestInit = {}) {
  return fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
    ...init,
    headers: { "Content-Type": "application/json", ...(who ? { Cookie: who.cookie } : {}) },
  });
}

const patch = (path: string, who: Actor, body: unknown) => call(path, who, { method: "PATCH", body: JSON.stringify(body) });

before(async () => {
  reachable = await serverReachable();
  owner = await actor("READER", "profile-owner");
  visitor = await actor("READER", "profile-visitor");
  board = await actor("BOARD", "profile-board");
  const writer = await makeUser("WRITER", "profile-writer");
  avatar = await prisma.platformAvatar.create({
    data: { url: `https://test-store.public.blob.vercel-storage.com/images/platform-avatar/${TAG}.webp`, label: `${TAG} Fox` },
    select: { id: true, url: true },
  });
  const series = await prisma.series.create({
    data: { title: `${TAG} shelf series`, description: "Test.", genre: "drama", authorId: writer.id, aiUsageTag: "AI_FREE", status: "PUBLISHED" },
    select: { id: true },
  });
  seriesId = series.id;
  await prisma.seriesFollow.create({ data: { userId: owner.id, seriesId } });
});

after(async () => {
  await prisma.platformAvatar.deleteMany({ where: { url: { contains: TAG } } });
  await cleanup();
  await prisma.$disconnect();
});

function requireServer(t: { skip: (message: string) => void }) {
  if (!reachable) t.skip(`dev server not reachable at ${BASE_URL}`);
  return reachable;
}

describe("profile editor", () => {
  test("the avatar library is for signed-in members", async (t) => {
    if (!requireServer(t)) return;
    assert.equal((await call("/api/avatars/library")).status, 401);
    const response = await call("/api/avatars/library", owner);
    assert.equal(response.status, 200);
    const { avatars } = await response.json();
    assert.ok(avatars.some((item: { id: string }) => item.id === avatar.id));
  });

  test("the picture must come from the library (or reset to the default)", async (t) => {
    if (!requireServer(t)) return;
    const outside = await patch("/api/me/profile-images", owner, {
      image: "https://test-store.public.blob.vercel-storage.com/images/profile-image/mine.webp",
    });
    assert.equal(outside.status, 400);

    assert.equal((await patch("/api/me/profile-images", owner, { image: avatar.url })).status, 200);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).image, avatar.url);

    assert.equal((await patch("/api/me/profile-images", owner, { image: null })).status, 200);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).image, null);
  });

  test("bio and visibility save for readers; bad values are refused", async (t) => {
    if (!requireServer(t)) return;
    assert.equal((await patch("/api/me/profile", owner, { readingProfileVisibility: "EVERYONE" })).status, 400);
    const saved = await patch("/api/me/profile", owner, { bio: `${TAG} bio line`, readingProfileVisibility: "PRIVATE" });
    assert.equal(saved.status, 200);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
    assert.equal(user.bio, `${TAG} bio line`);
    assert.equal(user.readingProfileVisibility, "PRIVATE");
  });

  test("public reading profile: header always, Library only when PUBLIC", async (t) => {
    if (!requireServer(t)) return;
    const path = `/reader/${owner.id}`;

    const privatePage = await (await call(path)).text();
    assert.match(privatePage, new RegExp(`${TAG} bio line`), "bio is shown");
    assert.match(privatePage, /This reading profile is private/);
    // (The series title can still appear in the sidebar's Trending list, so check the Library section itself.)
    assert.doesNotMatch(privatePage, /id="library-heading"|series followed/, "library hidden while private");
    assert.match(privatePage, /noindex/);

    await patch("/api/me/profile", owner, { readingProfileVisibility: "PUBLIC" });
    const publicPage = await (await call(path, visitor)).text();
    assert.match(publicPage, /id="library-heading"/, "library shown when public");
    assert.match(publicPage, new RegExp(`href="/series/${seriesId}"[^>]*>[\\s\\S]{0,1200}${TAG} shelf series`), "followed series listed");
    assert.doesNotMatch(publicPage, /This reading profile is private/);
    assert.doesNotMatch(publicPage, /aria-label="Edit profile"/, "visitors get no editor");

    const ownPage = await (await call("/reader", owner)).text();
    assert.match(ownPage, /aria-label="Edit profile"/, "the owner gets the pen");

    // notFound(): a 404, or (once the root layout has started streaming) a 200 carrying the not-found page.
    const missing = await call(`/reader/does-not-exist-${TAG}`);
    assert.ok([200, 404].includes(missing.status));
    const missingBody = await missing.text();
    assert.match(missingBody, /This page does not exist|NEXT_NOT_FOUND/);
    assert.doesNotMatch(missingBody, /Reader Profile/);
  });

  test("Settings no longer edits the profile", async (t) => {
    if (!requireServer(t)) return;
    // Sweep 7: Settings is a list of cards; the display name lives on Settings > Account.
    const page = await (await call("/settings", owner)).text();
    assert.match(page, /href="\/settings\/account"/);
    assert.doesNotMatch(page, /Save profile|Profile picture|Background picture/);
    assert.equal((await patch("/api/me/profile", owner, { name: "Renamed" })).status, 400, "name no longer accepted here");
  });

  test("removing a library avatar sends its users back to the default picture", async () => {
    await prisma.user.update({ where: { id: visitor.id }, data: { image: avatar.url } });
    const result = await removePlatformAvatar(board.id, avatar.id);
    assert.equal(result.ok, true);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: visitor.id } })).image, null);
  });
});
