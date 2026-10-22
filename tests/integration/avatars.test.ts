/*
 * Avatar place, photo routes, writer levels and frames, end to end over HTTP
 * against the dev server (the .env.local scratch database). A successful photo
 * upload needs Vercel Blob credentials, which local runs don't have, so these
 * tests cover everything up to storage; image processing is unit-tested.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { BASE_URL, TAG, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

type Actor = { id: string; cookie: string };
let reader: Actor;
let writer: Actor;
let board: Actor;
let ceo: Actor;
let banned: Actor;
let libraryUrl: string;
let reachable = false;

async function actor(role: "READER" | "WRITER" | "BOARD" | "CEO", label: string): Promise<Actor> {
  const user = await makeUser(role, label);
  return { id: user.id, cookie: await sessionCookie(user.id) };
}

function call(path: string, who: Actor | undefined, method = "GET", body?: unknown) {
  const isForm = body instanceof FormData;
  return fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: {
      ...(who ? { Cookie: who.cookie } : {}),
      ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
}

async function photoForm(file: Blob, crop = { x: 0.5, y: 0.5, zoom: 1 }) {
  const form = new FormData();
  form.append("file", file, "photo");
  form.append("x", String(crop.x));
  form.append("y", String(crop.y));
  form.append("zoom", String(crop.zoom));
  return form;
}

before(async () => {
  reachable = await serverReachable();
  reader = await actor("READER", "av-reader");
  writer = await actor("WRITER", "av-writer");
  board = await actor("BOARD", "av-board");
  ceo = await actor("CEO", "av-ceo");
  banned = await actor("READER", "av-banned");
  await prisma.memberRestriction.create({ data: { userId: banned.id, kind: "BAN", reason: `${TAG} test ban` } });
  libraryUrl = `https://example.invalid/images/platform-avatar/${TAG}.webp`;
  // A library avatar is one the Store lists (Sweep B3): a PlatformAvatar plus its active StoreItem
  // (removed with the avatar by cascade).
  const avatar = await prisma.platformAvatar.create({ data: { url: libraryUrl, label: `${TAG} avatar` } });
  await prisma.storeItem.create({
    data: { category: "AVATAR", name: `${TAG} avatar`, imageUrl: libraryUrl, sortOrder: 9000, platformAvatarId: avatar.id },
  });
});

after(async () => {
  await prisma.platformAvatar.deleteMany({ where: { url: libraryUrl } });
  await cleanup();
  await prisma.$disconnect();
});

function requireServer(t: { skip: (message: string) => void }) {
  if (!reachable) t.skip(`dev server not reachable at ${BASE_URL}`);
  return reachable;
}

describe("photo routes", () => {
  test("signed out and banned are refused with JSON", async (t) => {
    if (!requireServer(t)) return;
    for (const method of ["POST", "PATCH", "DELETE"]) {
      const anon = await call("/api/me/avatar/photo", undefined, method, method === "PATCH" ? { x: 0.5, y: 0.5, zoom: 1 } : undefined);
      assert.equal(anon.status, 401, method);
      assert.equal((await anon.json()).code, "UNAUTHENTICATED");
    }
    assert.equal((await call("/api/me/avatar/photo", banned, "DELETE")).status, 403);
  });

  test("bad input is refused before anything is stored", async (t) => {
    if (!requireServer(t)) return;
    assert.equal((await call("/api/me/avatar/photo", reader, "PATCH", { x: 0.5, y: 0.5, zoom: 1 })).status, 409, "no photo to adjust");
    assert.equal((await call("/api/me/avatar/photo", reader, "PATCH", { x: "a", y: 0.5, zoom: 1 })).status, 400);
    assert.equal((await call("/api/me/avatar/photo", reader, "PATCH", { x: 0.5, y: 0.5, zoom: 1, url: "https://x" })).status, 400, "strict body");

    const svg = new Blob(["<svg xmlns='http://www.w3.org/2000/svg'/>"], { type: "image/svg+xml" });
    assert.equal((await call("/api/me/avatar/photo", reader, "POST", await photoForm(svg))).status, 415);
    const png = new Blob([await sharp({ create: { width: 100, height: 100, channels: 3, background: "#333" } }).png().toBuffer()]);
    const badCrop = new FormData();
    badCrop.append("file", png, "photo");
    badCrop.append("x", "nope");
    assert.equal((await call("/api/me/avatar/photo", reader, "POST", badCrop)).status, 400);
    const tiny = await call("/api/me/avatar/photo", reader, "POST", await photoForm(png));
    assert.equal(tiny.status, 400);
    assert.match((await tiny.json()).error, /too small/);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: reader.id } })).avatarOriginalUrl, null);
  });

  test("the general upload route refuses profile photos", async (t) => {
    if (!requireServer(t)) return;
    const form = new FormData();
    form.append("purpose", "profile-image");
    form.append("file", new Blob(["x"]), "x");
    assert.equal((await call("/api/uploads/image", reader, "POST", form)).status, 403);
  });

  test("choosing a library avatar clears a photo; Remove goes back to the default and keeps library images", async (t) => {
    if (!requireServer(t)) return;
    // A photo as the server would have stored it (an outside URL here, so no storage delete is attempted).
    await prisma.user.update({
      where: { id: reader.id },
      data: { image: "https://example.invalid/crop.webp", avatarOriginalUrl: "https://example.invalid/orig.webp", avatarCropX: 0.4, avatarCropY: 0.5, avatarZoom: 2 },
    });
    assert.equal((await call("/api/me/profile-images", reader, "PATCH", { image: "https://example.invalid/other.webp" })).status, 400);
    assert.equal((await call("/api/me/profile-images", reader, "PATCH", { image: libraryUrl })).status, 200);
    const chosen = await prisma.user.findUniqueOrThrow({ where: { id: reader.id } });
    assert.equal(chosen.image, libraryUrl);
    assert.deepEqual([chosen.avatarOriginalUrl, chosen.avatarCropX, chosen.avatarCropY, chosen.avatarZoom], [null, null, null, null]);

    const removed = await call("/api/me/avatar/photo", reader, "DELETE");
    assert.deepEqual(await removed.json(), { image: null, originalUrl: null, crop: null });
    assert.equal(await prisma.platformAvatar.count({ where: { url: libraryUrl } }), 1, "library image kept");
  });

  test("Become a Writer never changes the picture", async (t) => {
    if (!requireServer(t)) return;
    const promoted = await actor("READER", "av-promote");
    const response = await call("/api/become-author", promoted, "POST", {
      acknowledged: true,
      displayName: `${TAG} promoted`,
      profileImage: "https://evil.invalid/x.webp",
    });
    assert.equal(response.status, 200);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: promoted.id } })).image, null);
  });
});

describe("avatar place and frames", () => {
  test("/reader/avatar is for signed-in members", async (t) => {
    if (!requireServer(t)) return;
    // Next 14 sends a 307, or a 200 carrying NEXT_REDIRECT once streaming has started.
    const anon = await call("/reader/avatar", undefined);
    if ([307, 308].includes(anon.status)) {
      assert.match(anon.headers.get("location") ?? "", /\/sign-in/);
    } else {
      const body = await anon.text();
      assert.match(/NEXT_REDIRECT;[^;]*;([^;"\\]+)/.exec(body)?.[1] ?? "", /\/sign-in/);
      assert.doesNotMatch(body, /My photo|Adjust position/, "the avatar place isn't sent");
    }
    const page = await (await call("/reader/avatar", reader)).text();
    assert.match(page, /Your avatar/);
    assert.match(page, /My photo/);
    assert.match(page, new RegExp(`${TAG} avatar`), "library avatars listed");
  });

  test("writer levels: Board/CEO set them (audited); the frame follows on the author page", async (t) => {
    if (!requireServer(t)) return;
    const path = (who: Actor) => `/api/admin/members/${who.id}/writer-level`;
    assert.equal((await call(path(writer), reader, "PATCH", { level: "ELITE" })).status, 403);
    assert.equal((await call(path(writer), writer, "PATCH", { level: "ELITE" })).status, 403, "not your own");
    assert.equal((await call(path(ceo), board, "PATCH", { level: "ELITE" })).status, 403, "Board can't change the CEO");
    assert.equal((await call(path(reader), board, "PATCH", { level: "ELITE" })).status, 400, "readers have no level");
    assert.equal((await call(path(writer), board, "PATCH", { level: "LEGEND" })).status, 400);

    assert.match(await (await call(`/author/${writer.id}`, undefined)).text(), /data-frame="ink"/);
    const saved = await call(path(writer), board, "PATCH", { level: "FEATURED" });
    assert.deepEqual(await saved.json(), { success: true, level: "FEATURED" });
    assert.equal(await prisma.adminAuditLog.count({ where: { actorId: board.id, targetUserId: writer.id, action: "WRITER_LEVEL_CHANGED" } }), 1);

    const author = await (await call(`/author/${writer.id}`, undefined)).text();
    assert.match(author, /data-frame="gilded"/);
    assert.match(author, /Featured writer/, "level given as text");
    assert.equal((await call(path(board), ceo, "PATCH", { level: "ELITE" })).status, 200, "the CEO can change a Board member's level");

    // Readers get no frame.
    assert.doesNotMatch(await (await call(`/reader/${reader.id}`, undefined)).text(), /data-frame=/);
  });
});
