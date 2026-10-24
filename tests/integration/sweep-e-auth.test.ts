/*
 * Sweep E: sign-in lockout per account, sign-up input limits, and the
 * signed-out answer of /api/auth/me. Over HTTP against the dev server on the
 * .env.local scratch database; everything made is tagged and removed.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { hashPassword } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { LOGIN_FAILURE_LIMITS } from "@/lib/rate-limit-rules";
import { BASE_URL, TAG, cleanup, makeUser, serverReachable } from "./helpers";

const PASSWORD = `${TAG}-Correct-Horse`;
let email = "";
let reachable = false;

before(async () => {
  reachable = await serverReachable();
  const user = await makeUser("READER", "e-login");
  const row = await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(PASSWORD) }, select: { email: true } });
  email = row.email!;
});

after(async () => {
  await cleanup(); // cascades the RateLimitHit rows
  await prisma.$disconnect();
});

const post = (path: string, body: unknown) =>
  fetch(`${BASE_URL}${path}`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("sign-in and sign-up limits (Sweep E)", () => {
  test("after too many wrong passwords the account is locked for a while, even with the right one", async (t) => {
    if (!reachable) return t.skip(`dev server not reachable at ${BASE_URL}`);
    const max = LOGIN_FAILURE_LIMITS[0].max;
    for (let i = 0; i < max; i++) {
      assert.equal((await post("/api/auth/login", { email, password: "wrong-password" })).status, 401, `attempt ${i + 1}`);
    }
    const locked = await post("/api/auth/login", { email, password: PASSWORD });
    assert.equal(locked.status, 429);
    assert.equal((await locked.json()).code, "RATE_LIMITED");
    // Unknown emails get the same 401 as a wrong password (nothing to lock, nothing revealed).
    assert.equal((await post("/api/auth/login", { email: `${TAG}-nobody@example.invalid`, password: "x" })).status, 401);
    // Over-long input is refused without hashing.
    assert.equal((await post("/api/auth/login", { email: `${TAG}-x@example.invalid`, password: "p".repeat(5000) })).status, 401);
  });

  test("sign-up refuses bad names, emails and passwords before creating anything", async (t) => {
    if (!reachable) return t.skip(`dev server not reachable at ${BASE_URL}`);
    const base = { name: "Test Name", email: `${TAG}-new@example.invalid`, password: "long-enough-pw" };
    for (const bad of [{ name: "x".repeat(41) }, { name: "a" }, { email: "not-an-email" }, { email: `${"a".repeat(250)}@x.io` }, { password: "p".repeat(201) }, { password: "short" }]) {
      const response = await post("/api/auth/register", { ...base, ...bad });
      assert.equal(response.status, 400, JSON.stringify(bad).slice(0, 60));
    }
    assert.equal(await prisma.user.count({ where: { email: base.email } }), 0);
  });

  test("/api/auth/me answers signed-out visitors with 200, not an error", async (t) => {
    if (!reachable) return t.skip(`dev server not reachable at ${BASE_URL}`);
    const response = await fetch(`${BASE_URL}/api/auth/me`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { authenticated: false, user: null });
  });
});
