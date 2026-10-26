/*
 * Sweep B3 over HTTP (scratch database): Administration › Content (who may
 * read and save, versions, conflicts, restore, audit, the live pages and the
 * fallback) and the Store (who may manage it, hiding, reordering, choosing an
 * avatar). Test users are tagged and removed; Content rows written here are
 * restored to what they were before the test.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "@/lib/prisma";
import { BASE_URL, TAG, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

type Actor = { id: string; cookie: string };
let board: Actor;
let writer: Actor;
let reader: Actor;
let reachable = false;

const KEY = "copy.footer";
let footerBefore: { row: { data: unknown; version: number; updatedById: string | null } | null; revisions: number[] };
const storeIds: string[] = [];
const avatarIds: string[] = [];

async function actor(role: "READER" | "WRITER" | "BOARD", label: string): Promise<Actor> {
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

before(async () => {
  reachable = await serverReachable();
  board = await actor("BOARD", "cs-board");
  writer = await actor("WRITER", "cs-writer");
  reader = await actor("READER", "cs-reader");
  const row = await prisma.contentItem.findUnique({ where: { key: KEY }, select: { data: true, version: true, updatedById: true } });
  const revisions = await prisma.contentRevision.findMany({ where: { key: KEY }, select: { version: true } });
  footerBefore = { row, revisions: revisions.map((revision) => revision.version) };

  // Two Store avatars for this test (fake image URLs under the library path; never fetched by the server).
  for (const [index, active] of [true, false].entries()) {
    const url = `https://example.invalid/images/platform-avatar/${TAG}-${index}.webp`;
    const avatar = await prisma.platformAvatar.create({ data: { label: `${TAG} avatar ${index}`, url } });
    const item = await prisma.storeItem.create({
      data: { category: "AVATAR", name: `${TAG} avatar ${index}`, imageUrl: url, active, sortOrder: 9000 + index, platformAvatarId: avatar.id },
    });
    avatarIds.push(avatar.id);
    storeIds.push(item.id);
  }
});

after(async () => {
  // Put the footer item back exactly as it was.
  await prisma.contentRevision.deleteMany({ where: { key: KEY, version: { notIn: footerBefore.revisions } } });
  if (footerBefore.row) {
    await prisma.contentItem.update({
      where: { key: KEY },
      data: { data: footerBefore.row.data as object, version: footerBefore.row.version, updatedById: footerBefore.row.updatedById },
    });
  } else {
    await prisma.contentItem.deleteMany({ where: { key: KEY } });
  }
  await prisma.platformAvatar.deleteMany({ where: { id: { in: avatarIds } } });
  await cleanup();
  await prisma.$disconnect();
});

function requireServer(t: { skip: (message: string) => void }) {
  if (!reachable) t.skip(`dev server not reachable at ${BASE_URL}`);
  return reachable;
}

describe("Administration › Content", () => {
  test("only Board and CEO can read or change Content; JSON 401/403", async (t) => {
    if (!requireServer(t)) return;
    for (const [who, status] of [[undefined, 401], [reader, 403], [writer, 403]] as const) {
      assert.equal((await call(`/api/admin/content/${KEY}`, who)).status, status);
      const put = await call(`/api/admin/content/${KEY}`, who, "PUT", { baseVersion: 0, values: { tagline: "x" } });
      assert.equal(put.status, status);
      assert.match(put.headers.get("content-type") ?? "", /json/);
      assert.equal((await call(`/api/admin/content/${KEY}/revisions`, who)).status, status);
      assert.equal((await call(`/api/admin/content/${KEY}/restore`, who, "POST", { version: 0, baseVersion: 0 })).status, status);
    }
    assert.equal((await call("/api/admin/content/not.a.key", board)).status, 404);
  });

  test("save makes a new version, refuses stale or invalid saves, and is audited", async (t) => {
    if (!requireServer(t)) return;
    const state = await (await call(`/api/admin/content/${KEY}`, board)).json();
    const tagline = `${TAG} tagline`;

    const invalid = await call(`/api/admin/content/${KEY}`, board, "PUT", { baseVersion: state.version, values: { tagline, extra: 1 } });
    assert.equal(invalid.status, 400);
    const tooLong = await call(`/api/admin/content/${KEY}`, board, "PUT", { baseVersion: state.version, values: { tagline: "x".repeat(81) } });
    assert.equal((await tooLong.json()).field, "tagline");

    const saved = await call(`/api/admin/content/${KEY}`, board, "PUT", { baseVersion: state.version, values: { tagline } });
    assert.equal(saved.status, 200);
    const next = await saved.json();
    assert.equal(next.version, state.version + 1);
    assert.equal(next.values.tagline, tagline);
    assert.match(next.updatedBy, new RegExp(TAG));

    const stale = await call(`/api/admin/content/${KEY}`, board, "PUT", { baseVersion: state.version, values: { tagline: "stale" } });
    assert.equal(stale.status, 409);

    const audit = await prisma.adminAuditLog.findFirst({ where: { actorId: board.id, action: "CONTENT_SAVED" }, select: { details: true } });
    assert.deepEqual(audit?.details, { key: KEY, version: next.version });

    // The live site shows it (the footer is on every page).
    const home = await (await call("/explore", undefined)).text();
    assert.match(home, new RegExp(tagline));
  });

  test("history lists versions and restore saves an old one as a new version", async (t) => {
    if (!requireServer(t)) return;
    const { revisions } = await (await call(`/api/admin/content/${KEY}/revisions`, board)).json();
    assert.ok(revisions.length >= 1);
    const state = await (await call(`/api/admin/content/${KEY}`, board)).json();
    const restored = await call(`/api/admin/content/${KEY}/restore`, board, "POST", { version: 0, baseVersion: state.version });
    assert.equal(restored.status, 200);
    const next = await restored.json();
    assert.equal(next.version, state.version + 1);
    assert.equal(next.values.tagline, "Stories performed in text");
    assert.ok(await prisma.adminAuditLog.findFirst({ where: { actorId: board.id, action: "CONTENT_RESTORED" } }));
  });

  test("an invalid stored item falls back to the built-in text", async (t) => {
    if (!requireServer(t)) return;
    const state = await (await call(`/api/admin/content/${KEY}`, board)).json();
    await prisma.contentItem.update({ where: { key: KEY }, data: { data: { tagline: 42 } } });
    // Saves clear the cache by tag; this direct write doesn't, so ask the editor (uncached) and a fresh save.
    const editor = await (await call(`/api/admin/content/${KEY}`, board)).json();
    assert.equal(editor.storedInvalid, true);
    assert.equal(editor.values.tagline, "Stories performed in text");
    const fixed = await call(`/api/admin/content/${KEY}`, board, "PUT", { baseVersion: state.version, values: { tagline: "Stories performed in text" } });
    assert.equal(fixed.status, 200);
  });

  test("legal pages keep their placeholders until they are filled", async (t) => {
    if (!requireServer(t)) return;
    const page = await (await call("/terms", undefined)).text();
    assert.match(page, /Terms of Service/);
    assert.match(page, /\[EFFECTIVE DATE\]|Effective /);
    assert.doesNotMatch(page, /<script>alert/);
  });
});

describe("Store", () => {
  test("only Board and CEO manage the Store; JSON 401/403", async (t) => {
    if (!requireServer(t)) return;
    for (const [who, status] of [[undefined, 401], [reader, 403], [writer, 403]] as const) {
      assert.equal((await call(`/api/admin/store/items/${storeIds[0]}`, who, "PATCH", { active: false })).status, status);
      assert.equal((await call(`/api/admin/store/items/${storeIds[0]}`, who, "DELETE")).status, status);
      assert.equal((await call("/api/admin/store/order", who, "PUT", { category: "AVATAR", ids: [] })).status, status);
    }
  });

  test("the Store shows active items only, and only active ones can be chosen", async (t) => {
    if (!requireServer(t)) return;
    const page = await (await call("/store", undefined)).text();
    assert.match(page, new RegExp(`${TAG} avatar 0`));
    assert.doesNotMatch(page, new RegExp(`${TAG} avatar 1`));
    // No prices in what visitors see. Script contents are left out: Next's page data has references like "$7".
    assert.doesNotMatch(page.replace(/<script[\s\S]*?<\/script>/g, ""), /\$\d|price/i);

    const hidden = await call("/api/me/profile-images", reader, "PATCH", { image: `https://example.invalid/images/platform-avatar/${TAG}-1.webp` });
    assert.equal(hidden.status, 400);
    const chosen = await call("/api/me/profile-images", reader, "PATCH", { image: `https://example.invalid/images/platform-avatar/${TAG}-0.webp` });
    assert.equal(chosen.status, 200);
    const mine = await (await call("/store", reader)).text();
    assert.match(mine, /currently using/);
  });

  test("hiding keeps the item for members already using it; rename and reorder are audited", async (t) => {
    if (!requireServer(t)) return;
    const hide = await call(`/api/admin/store/items/${storeIds[0]}`, board, "PATCH", { active: false, name: `${TAG} renamed` });
    assert.equal(hide.status, 200);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: reader.id }, select: { image: true } });
    assert.match(user.image ?? "", new RegExp(`${TAG}-0`), "still using it");
    const avatar = await prisma.platformAvatar.findUniqueOrThrow({ where: { id: avatarIds[0] }, select: { label: true } });
    assert.equal(avatar.label, `${TAG} renamed`);

    const all = await prisma.storeItem.findMany({ where: { category: "AVATAR" }, orderBy: { sortOrder: "asc" }, select: { id: true } });
    const ids = all.map((item) => item.id);
    assert.equal((await call("/api/admin/store/order", board, "PUT", { category: "AVATAR", ids: ids.slice(1) })).status, 409);
    const reversed = [...ids].reverse();
    assert.equal((await call("/api/admin/store/order", board, "PUT", { category: "AVATAR", ids: reversed })).status, 200);
    await call("/api/admin/store/order", board, "PUT", { category: "AVATAR", ids });
    assert.ok(await prisma.adminAuditLog.findFirst({ where: { actorId: board.id, action: "STORE_ITEM_REORDERED" } }));
  });

  test("removing an item resets members using it to the default", async (t) => {
    if (!requireServer(t)) return;
    const removed = await call(`/api/admin/store/items/${storeIds[0]}`, board, "DELETE");
    assert.equal(removed.status, 200);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: reader.id }, select: { image: true } });
    assert.equal(user.image, null);
    assert.equal(await prisma.storeItem.count({ where: { id: storeIds[0] } }), 0);
  });
});
