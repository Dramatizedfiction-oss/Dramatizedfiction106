/*
 * Sweep D2: only Board and CEO can create, change, remove or upload library
 * avatars. Readers and writers calling the routes directly get JSON 403 (and
 * signed-out callers JSON 401), and nothing is created. A member's own photo
 * (/api/me/avatar/photo) is a separate feature and isn't covered here.
 * Runs over HTTP against the dev server on the .env.local scratch database;
 * everything created is tagged and removed afterwards.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "@/lib/prisma";
import { BASE_URL, TAG, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

type Actor = { id: string; cookie: string };
let reader: Actor;
let writer: Actor;
let avatarId: string;
let storeItemId: string;
let reachable = false;
const libraryUrl = `https://example.invalid/images/platform-avatar/${TAG}.webp`;

async function actor(role: "READER" | "WRITER", label: string): Promise<Actor> {
  const user = await makeUser(role, label);
  return { id: user.id, cookie: await sessionCookie(user.id) };
}

before(async () => {
  reachable = await serverReachable();
  reader = await actor("READER", "d2-reader");
  writer = await actor("WRITER", "d2-writer");
  const avatar = await prisma.platformAvatar.create({ data: { url: libraryUrl, label: `${TAG} avatar` } });
  const item = await prisma.storeItem.create({
    data: { category: "AVATAR", name: `${TAG} avatar`, imageUrl: libraryUrl, sortOrder: 9000, platformAvatarId: avatar.id },
  });
  avatarId = avatar.id;
  storeItemId = item.id;
});

after(async () => {
  await prisma.platformAvatar.deleteMany({ where: { url: libraryUrl } });
  await cleanup();
  await prisma.$disconnect();
});

function call(path: string, who: Actor | undefined, method: string, body?: unknown) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(who ? { Cookie: who.cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function upload(who: Actor | undefined) {
  const form = new FormData();
  form.append("purpose", "platform-avatar");
  form.append("file", new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }), "a.jpg");
  return fetch(`${BASE_URL}/api/uploads/image`, { method: "POST", redirect: "manual", headers: who ? { Cookie: who.cookie } : {}, body: form });
}

describe("library avatars are Board and CEO only (Sweep D2)", () => {
  test("readers, writers and signed-out callers are refused with JSON, and nothing changes", async (t) => {
    if (!reachable) return t.skip(`dev server not reachable at ${BASE_URL}`);
    const avatarsBefore = await prisma.platformAvatar.count();
    const requests: [string, (who: Actor | undefined) => Promise<Response>][] = [
      ["add avatar", (who) => call("/api/admin/avatars", who, "POST", { url: `https://example.invalid/images/platform-avatar/${TAG}-new.webp`, label: "x" })],
      ["set defaults", (who) => call("/api/admin/avatars", who, "PUT", { readerId: avatarId, writerId: null, confirm: true })],
      ["remove avatar", (who) => call(`/api/admin/avatars/${avatarId}`, who, "DELETE")],
      ["rename/hide item", (who) => call(`/api/admin/store/items/${storeItemId}`, who, "PATCH", { name: "renamed", active: false })],
      ["remove item", (who) => call(`/api/admin/store/items/${storeItemId}`, who, "DELETE")],
      ["reorder", (who) => call("/api/admin/store/order", who, "PUT", { category: "AVATAR", ids: [] })],
      ["upload image", upload],
    ];
    for (const [name, send] of requests) {
      for (const [who, status] of [[undefined, 401], [reader, 403], [writer, 403]] as const) {
        const response = await send(who);
        assert.equal(response.status, status, `${name} as ${who === undefined ? "signed out" : who === reader ? "reader" : "writer"}`);
        assert.match(response.headers.get("content-type") ?? "", /application\/json/, `${name}: JSON, not a redirect`);
      }
    }
    assert.equal(await prisma.platformAvatar.count(), avatarsBefore, "no avatar added or removed");
    const item = await prisma.storeItem.findUniqueOrThrow({ where: { id: storeItemId }, select: { name: true, active: true } });
    assert.deepEqual(item, { name: `${TAG} avatar`, active: true }, "item unchanged");
  });

  test("the Store page only browses and chooses", async (t) => {
    if (!reachable) return t.skip(`dev server not reachable at ${BASE_URL}`);
    const html = await (await call("/store", reader, "GET")).text();
    assert.match(html, new RegExp(`${TAG} avatar`));
    assert.doesNotMatch(html, /tab=photo|Use your own photo|\/api\/admin\//);
  });
});
