/*
 * End-to-end access checks over HTTP against a dev server that uses the
 * development database (`npm run dev` reads .env.local). Each test user gets a
 * real session row, so these requests behave exactly like a signed-in browser.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { ensurePlatformSettingsId } from "@/lib/phases";
import { prisma } from "@/lib/prisma";
import { BASE_URL, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

type Actor = { id: string; cookie: string };
const actors: Record<"reader" | "writer" | "board" | "ceo", Actor> = {} as never;
let reachable = false;

async function call(path: string, actor?: Actor, init: RequestInit = {}) {
  return fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
    ...init,
    headers: { "Content-Type": "application/json", ...(actor ? { Cookie: actor.cookie } : {}), ...(init.headers ?? {}) },
  });
}

const post = (path: string, actor: Actor | undefined, body: unknown, method = "POST") =>
  call(path, actor, { method, body: JSON.stringify(body) });

/** Text that only appears when an Administration / CEO Studio page actually renders. */
const PROTECTED_MARKERS = /Search by name or exact email|Board seats|Renovation Mode|Phase 2: Monetization|High-impact decisions/;

/**
 * Asserts the server refused the page and sent the visitor to `target`, without
 * sending the protected content. Next.js 14 issues a 307 when the redirect
 * happens before streaming starts, or a 200 carrying a NEXT_REDIRECT
 * instruction when a nested layout redirects after the root layout has
 * started streaming. Both are server-side; neither renders the page.
 */
async function expectRedirect(response: Response, target: RegExp, label: string) {
  if ([307, 308].includes(response.status)) {
    assert.match(response.headers.get("location") ?? "", target, label);
    return;
  }
  assert.equal(response.status, 200, `${label}: unexpected status ${response.status}`);
  const body = await response.text();
  const redirect = /NEXT_REDIRECT;[^;]*;([^;"\\]+)/.exec(body)?.[1] ?? "";
  assert.match(redirect, target, `${label}: no server redirect found`);
  assert.doesNotMatch(body, PROTECTED_MARKERS, `${label}: protected content was sent`);
}

before(async () => {
  reachable = await serverReachable();
  for (const role of ["READER", "WRITER", "BOARD", "CEO"] as const) {
    const user = await makeUser(role, `http-${role.toLowerCase()}`);
    actors[role.toLowerCase() as keyof typeof actors] = { id: user.id, cookie: await sessionCookie(user.id) };
  }
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

function requireServer(t: { skip: (message: string) => void }) {
  if (!reachable) t.skip(`dev server not reachable at ${BASE_URL}`);
  return reachable;
}

describe("Administration and CEO Studio pages", () => {
  test("readers and writers are turned away from both areas", async (t) => {
    if (!requireServer(t)) return;
    for (const actor of [actors.reader, actors.writer]) {
      for (const path of ["/administration", "/administration/members", "/ceo-studio", "/ceo-studio/phases/2"]) {
        await expectRedirect(await call(path, actor), /^\/explore/, path);
      }
    }
  });

  test("Board can use Administration but is sent away from CEO Studio", async (t) => {
    if (!requireServer(t)) return;
    const members = await call("/administration/members", actors.board);
    assert.equal(members.status, 200);
    assert.match(await members.text(), /Search by name or exact email/);
    await expectRedirect(await call("/ceo-studio", actors.board), /^\/administration/, "/ceo-studio");
    await expectRedirect(await call("/ceo-studio/phases/2", actors.board), /^\/administration/, "/ceo-studio/phases/2");
  });

  test("the CEO can open both", async (t) => {
    if (!requireServer(t)) return;
    assert.equal((await call("/administration", actors.ceo)).status, 200);
    assert.equal((await call("/ceo-studio", actors.ceo)).status, 200);
  });
});

describe("API authorization", () => {
  test("role changes: only a CEO with the right password", async (t) => {
    if (!requireServer(t)) return;
    const target = await makeUser("READER", "http-role-target");
    const url = `/api/admin/members/${target.id}/role`;
    const body = (password: string) => ({ change: "MAKE_BOARD", ceoPassword: password, confirm: true });

    for (const actor of [actors.reader, actors.writer, actors.board]) {
      assert.equal((await post(url, actor, body(process.env.CEO_PASSWORD ?? "x"))).status, 403);
    }
    assert.equal((await post(url, undefined, body("x"))).status, 401);
    assert.equal((await post(url, actors.ceo, body("definitely-wrong-password"))).status, 403);
    assert.equal((await post(url, actors.ceo, { change: "MAKE_BOARD", ceoPassword: "x", confirm: true, role: "CEO" })).status, 400);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).role, "READER");
  });

  test("phase activation: refused for Board, wrong password, and while not ready", async (t) => {
    if (!requireServer(t)) return;
    const id = await ensurePlatformSettingsId();
    const before = await prisma.settings.findUniqueOrThrow({ where: { id } });

    assert.equal((await post("/api/ceo/phases/2/activate", actors.board, { ceoPassword: "x", confirm: true })).status, 403);
    assert.equal((await post("/api/ceo/phases/2/activate", actors.ceo, { ceoPassword: "wrong-password-123", confirm: true })).status, 403);
    if (process.env.CEO_PASSWORD) {
      const notReady = await post("/api/ceo/phases/2/activate", actors.ceo, { ceoPassword: process.env.CEO_PASSWORD, confirm: true });
      assert.equal(notReady.status, 409);
    }
    const afterRow = await prisma.settings.findUniqueOrThrow({ where: { id } });
    assert.equal(afterRow.phaseTwoUnlocked, before.phaseTwoUnlocked);
    assert.equal(afterRow.enablePayments, before.enablePayments);
  });

  test("moderation API: writers can't, Board can't touch the CEO", async (t) => {
    if (!requireServer(t)) return;
    const body = { action: "BAN", reason: "test", confirm: true };
    assert.equal((await post(`/api/admin/members/${actors.reader.id}/moderation`, actors.writer, body)).status, 403);
    assert.equal((await post(`/api/admin/members/${actors.ceo.id}/moderation`, actors.board, body)).status, 403);
  });
});

describe("restrictions are enforced on the server", () => {
  test("a disciplined writer loses Writer Studio and APIs; access returns when it ends", async (t) => {
    if (!requireServer(t)) return;
    const writer = await makeUser("WRITER", "http-disciplined");
    const actor = { id: writer.id, cookie: await sessionCookie(writer.id) };

    // Before: the writer can act (an empty body creates an untitled draft series; removed in cleanup).
    assert.equal((await post("/api/writer-studio/series", actor, {})).status, 200);
    assert.equal((await post(`/api/admin/members/${writer.id}/moderation`, actors.board, { action: "DISCIPLINE", reason: "test", confirm: true })).status, 200);

    const api = await post("/api/writer-studio/series", actor, {});
    assert.equal(api.status, 403);
    assert.equal((await api.json()).code, "ACCOUNT_RESTRICTED");
    assert.equal((await post("/api/me/profile", actor, { name: "x" }, "PATCH")).status, 403);
    await expectRedirect(await call("/writer-studio", actor), /^\/account-restricted/, "/writer-studio");
    assert.equal((await call("/explore", actor)).status, 200); // reading still allowed

    await prisma.memberRestriction.updateMany({ where: { userId: writer.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    assert.equal((await post("/api/writer-studio/series", actor, {})).status, 200);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: writer.id } })).role, "WRITER");
  });

  test("a banned member sees only the suspension notice and can't call APIs", async (t) => {
    if (!requireServer(t)) return;
    const reader = await makeUser("READER", "http-banned");
    const actor = { id: reader.id, cookie: await sessionCookie(reader.id) };
    assert.equal((await post(`/api/admin/members/${reader.id}/moderation`, actors.board, { action: "BAN", reason: "test", confirm: true })).status, 200);

    const home = await call("/explore", actor);
    assert.match(await home.text(), /This account has been suspended/);
    assert.equal((await post("/api/me/profile", actor, { name: "x" }, "PATCH")).status, 403);
    assert.equal((await call("/api/auth/me", actor)).status, 200); // can still see status and sign out
  });
});

describe("Renovation Mode", () => {
  test("closes the site for the public and members; CEO and Board keep access", async (t) => {
    if (!requireServer(t)) return;
    assert.equal((await post("/api/admin/renovation", actors.board, { enabled: true, confirm: true }, "PUT")).status, 403);
    assert.equal((await post("/api/admin/renovation", actors.ceo, { enabled: true, confirm: true }, "PUT")).status, 200);
    try {
      const anonymous = await call("/explore");
      const html = await anonymous.text();
      assert.match(html, /setting the stage/);
      assert.doesNotMatch(html, /Trending Now/); // the real page isn't sent

      assert.match(await (await call("/explore", actors.writer)).text(), /setting the stage/);
      assert.equal((await post("/api/writer-studio/series", actors.writer, {})).status, 503);
      assert.equal((await post("/api/auth/register", undefined, { name: "x", email: "x@example.invalid", password: "12345678" })).status, 503);
      assert.equal((await call("/sign-in")).status, 200);

      assert.doesNotMatch(await (await call("/explore", actors.board)).text(), /setting the stage/);
      assert.equal((await call("/administration/renovation", actors.ceo)).status, 200);
    } finally {
      assert.equal((await post("/api/admin/renovation", actors.ceo, { enabled: false, confirm: true }, "PUT")).status, 200);
    }
    assert.doesNotMatch(await (await call("/explore")).text(), /setting the stage/);
  });
});
