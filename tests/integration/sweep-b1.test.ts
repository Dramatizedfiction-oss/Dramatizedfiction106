/*
 * Sweep B1 over HTTP (scratch database): the sign-out response, the themed
 * status pages and Explore's Trending / Newest switch.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "@/lib/prisma";
import { BASE_URL, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

let reachable = false;

before(async () => {
  reachable = await serverReachable();
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

function requireServer(t: { skip: (message: string) => void }) {
  if (!reachable) t.skip(`dev server not reachable at ${BASE_URL}`);
  return reachable;
}

const get = (path: string, cookie?: string) => fetch(`${BASE_URL}${path}`, { redirect: "manual", headers: cookie ? { Cookie: cookie } : {} });

describe("sign-out", () => {
  test("clears the cookie, deletes the session and is never cached", async (t) => {
    if (!requireServer(t)) return;
    const user = await makeUser("READER", "b1-signout");
    const cookie = await sessionCookie(user.id);
    const token = cookie.split("=")[1];

    const response = await fetch(`${BASE_URL}/api/auth/logout`, { method: "POST", headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    const setCookie = response.headers.get("set-cookie") ?? "";
    assert.match(setCookie, /df\.session-token=;/);
    assert.match(setCookie, /Expires=Thu, 01 Jan 1970/i);
    assert.equal(await prisma.session.count({ where: { sessionToken: token } }), 0);
    // Signed out is a normal 200 answer (Sweep E), never a session.
    const me = await get("/api/auth/me", cookie);
    assert.equal(me.status, 200);
    assert.deepEqual(await me.json(), { authenticated: false, user: null });
  });

  test("signing out without a session still answers 200 and clears the cookie", async (t) => {
    if (!requireServer(t)) return;
    const response = await fetch(`${BASE_URL}/api/auth/logout`, { method: "POST" });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie") ?? "", /df\.session-token=;/);
  });
});

describe("status pages", () => {
  test("each code has its themed page; others are the 404", async (t) => {
    if (!requireServer(t)) return;
    const expected: Record<number, RegExp> = {
      401: /Sign in to turn the page/,
      403: /This chapter is for other eyes/,
      404: /This page wandered off the map/,
      429: /The ink is still drying/,
      500: /The author dropped the manuscript/,
      503: /The writers are on a break/,
    };
    for (const [code, text] of Object.entries(expected)) {
      const html = await (await get(`/status/${code}`)).text();
      assert.match(html, text, code);
      assert.match(html, /night-desert-800\.webp/, `${code} uses the scene`);
      assert.match(html, /noindex/, `${code} isn't indexed`);
    }
    // notFound() after streaming has begun: a 200 carrying NEXT_NOT_FOUND, then the themed 404 renders.
    assert.match(await (await get("/status/418")).text(), /wandered off the map|NEXT_NOT_FOUND/);
    assert.match(await (await get("/series/no-such-series")).text(), /wandered off the map|NEXT_NOT_FOUND/);
  });

  test("a signed-in reader is sent to the 403 page from Administration", async (t) => {
    if (!requireServer(t)) return;
    const reader = await makeUser("READER", "b1-reader");
    const response = await get("/administration", await sessionCookie(reader.id));
    const body = response.status === 200 ? await response.text() : "";
    assert.ok([307, 308].includes(response.status) || /NEXT_REDIRECT[^"]*\/status\/403/.test(body), `status ${response.status}`);
    if (response.status !== 200) assert.match(response.headers.get("location") ?? "", /^\/status\/403/);
  });
});

describe("Explore", () => {
  test("the top row follows the switch, from the URL or the visit's cookie", async (t) => {
    if (!requireServer(t)) return;
    assert.match(await (await get("/explore")).text(), />Trending now</);
    assert.match(await (await get("/explore?sort=newest")).text(), />Newest</);
    const remembered = await fetch(`${BASE_URL}/explore`, { headers: { Cookie: "df-explore-sort=newest" } });
    assert.match(await remembered.text(), />Newest</);
  });
});
