/*
 * Settings > Account end to end over HTTP against the dev server on the
 * .env.local scratch database. Only tagged throwaway accounts are created,
 * changed and deleted; cleanup removes anything left.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { hashPassword } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { BASE_URL, TAG, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

const PASSWORD = "old-password-123";
type Actor = { id: string; cookie: string; email: string };
let reader: Actor;
let writer: Actor;
let follower: Actor;
let reachable = false;

async function actor(role: "READER" | "WRITER", label: string): Promise<Actor> {
  const user = await makeUser(role, label);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(PASSWORD) } });
  const { email } = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { email: true } });
  return { id: user.id, cookie: await sessionCookie(user.id), email: email! };
}

function call(path: string, who: Actor | undefined, method: string, body?: unknown) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: { "Content-Type": "application/json", ...(who ? { Cookie: who.cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

before(async () => {
  reachable = await serverReachable();
  reader = await actor("READER", "account-reader");
  writer = await actor("WRITER", "account-writer");
  follower = await actor("READER", "account-follower");
  await prisma.authorProfile.create({ data: { userId: writer.id, displayName: "Old" } });
});

after(async () => {
  await prisma.studio.deleteMany({ where: { slug: { startsWith: TAG } } });
  await cleanup();
  await prisma.$disconnect();
});

function requireServer(t: { skip: (message: string) => void }) {
  if (!reachable) t.skip(`dev server not reachable at ${BASE_URL}`);
  return reachable;
}

describe("account settings", () => {
  test("every account route refuses signed-out callers with JSON 401", async (t) => {
    if (!requireServer(t)) return;
    for (const [path, method] of [
      ["/api/me/account/name", "PATCH"],
      ["/api/me/account/age", "POST"],
      ["/api/me/account/password", "POST"],
      ["/api/me/account", "DELETE"],
    ] as const) {
      const response = await call(path, undefined, method, {});
      assert.equal(response.status, 401, path);
      assert.equal((await response.json()).code, "UNAUTHENTICATED");
    }
  });

  test("display name: validated, and the writer copy updates too", async (t) => {
    if (!requireServer(t)) return;
    assert.equal((await call("/api/me/account/name", writer, "PATCH", { name: " a " })).status, 400);
    assert.equal((await call("/api/me/account/name", writer, "PATCH", { name: "x".repeat(41) })).status, 400);
    const ok = await call("/api/me/account/name", writer, "PATCH", { name: `  ${TAG}   Pen  ` });
    assert.equal(ok.status, 200);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: writer.id }, include: { authorProfile: true } });
    assert.equal(user.name, `${TAG} Pen`);
    assert.equal(user.authorProfile?.displayName, `${TAG} Pen`);
  });

  test("18+: under-18 and fake dates store nothing; 18+ stores only time + version", async (t) => {
    if (!requireServer(t)) return;
    const thisYear = new Date().getUTCFullYear();
    const young = await call("/api/me/account/age", reader, "POST", { day: "1", month: "1", year: String(thisYear - 10) });
    assert.equal(young.status, 422);
    assert.equal((await call("/api/me/account/age", reader, "POST", { day: "31", month: "2", year: "1990" })).status, 400);
    let row = await prisma.user.findUniqueOrThrow({ where: { id: reader.id } });
    assert.equal(row.ageConfirmedAt, null);
    assert.equal(row.ageConfirmationVersion, null);

    const adult = await call("/api/me/account/age", reader, "POST", { day: "15", month: "6", year: "1990" });
    assert.equal(adult.status, 200);
    row = await prisma.user.findUniqueOrThrow({ where: { id: reader.id } });
    assert.ok(row.ageConfirmedAt);
    assert.equal(row.ageConfirmationVersion, "2026-10");
    assert.doesNotMatch(JSON.stringify(row), /1990/, "the birthdate is not stored anywhere on the user");

    const page = await (await call("/settings/account", reader, "GET")).text();
    assert.match(page, /Confirmed on/);
  });

  test("password: verifies the current one, then signs out other sessions but not this one", async (t) => {
    if (!requireServer(t)) return;
    const other = await sessionCookie(reader.id);
    assert.equal((await call("/api/me/account/password", reader, "POST", { currentPassword: "nope", newPassword: "brand-new-pass-1" })).status, 403);
    assert.equal((await call("/api/me/account/password", reader, "POST", { currentPassword: PASSWORD, newPassword: "short" })).status, 400);

    const ok = await call("/api/me/account/password", reader, "POST", { currentPassword: PASSWORD, newPassword: "brand-new-pass-1" });
    assert.equal(ok.status, 200);
    const tokens = (await prisma.session.findMany({ where: { userId: reader.id }, select: { sessionToken: true } })).map((s) => s.sessionToken);
    assert.ok(tokens.includes(reader.cookie.split("=")[1]), "current session kept");
    assert.ok(!tokens.includes(other.split("=")[1]), "other session signed out");

    const login = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: reader.email, password: "brand-new-pass-1" }),
    });
    assert.equal(login.status, 200, "can sign in with the new password");
  });

  test("delete: needs the password and DELETE, then removes a writer and their stories end to end", async (t) => {
    if (!requireServer(t)) return;
    const series = await prisma.series.create({
      data: { title: `${TAG} doomed`, description: "Test.", genre: "drama", authorId: writer.id, aiUsageTag: "AI_FREE", status: "PUBLISHED" },
    });
    await prisma.episode.create({
      data: { title: `${TAG} ep`, episodeNumber: 1, body: "<p>x</p>", readTime: 1, seriesId: series.id, authorId: writer.id, aiUsageTag: "AI_FREE", status: "PUBLISHED" },
    });
    await prisma.seriesFollow.create({ data: { userId: follower.id, seriesId: series.id } });
    await prisma.studio.create({ data: { name: `${TAG} studio`, slug: `${TAG}-studio`, kind: "PERSONAL", ownerId: writer.id } });

    const summaryPage = await (await call("/settings/account/delete", writer, "GET")).text();
    assert.match(summaryPage, /1(<!-- -->)? series and (<!-- -->)?1(<!-- -->)? episode/);

    assert.equal((await call("/api/me/account", writer, "DELETE", { password: PASSWORD, confirmation: "delete" })).status, 400);
    assert.equal((await call("/api/me/account", writer, "DELETE", { password: "wrong", confirmation: "DELETE" })).status, 403);
    assert.ok(await prisma.user.findUnique({ where: { id: writer.id } }), "nothing deleted yet");

    const deleted = await call("/api/me/account", writer, "DELETE", { password: PASSWORD, confirmation: "DELETE" });
    assert.equal(deleted.status, 200);
    assert.match(deleted.headers.get("set-cookie") ?? "", /df\.session-token=;/, "this browser's cookie is cleared");

    assert.equal(await prisma.user.findUnique({ where: { id: writer.id } }), null);
    assert.equal(await prisma.session.count({ where: { userId: writer.id } }), 0);
    assert.equal(await prisma.series.findUnique({ where: { id: series.id } }), null);
    assert.equal(await prisma.seriesFollow.count({ where: { seriesId: series.id } }), 0);
    assert.equal(await prisma.studio.count({ where: { slug: `${TAG}-studio` } }), 0, "personal studio cleaned up");
    assert.ok(await prisma.user.findUnique({ where: { id: follower.id } }), "other members are untouched");
  });
});
