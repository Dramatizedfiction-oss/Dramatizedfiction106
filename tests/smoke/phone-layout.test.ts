import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { createContext, removeFixtures, type Fixtures } from "@/tests/phone/fixtures";
import { buildVisits, smokeVisits } from "@/tests/phone/routes";
import { blocking, loadBrowser, runAudit, SMOKE_SIZES } from "@/tests/phone/run";

/*
 * Phone layout smoke test (Sweep 4): the most-used screens at 320×568,
 * 390×844 and 812×375, signed out and signed in, through a real browser.
 * Fails on anything that breaks a phone layout: sideways scrolling, elements
 * past the screen edge, tap targets hidden under a bar, fixed bars on top of
 * each other. Small targets and small text are reported by the full checker
 * (npm run test:phone) instead of failing here.
 *
 * Skipped (with a message) when playwright-core or a browser isn't
 * installed: npm install --no-save playwright-core@1.48.2
 */

if (process.env.DF_SMOKE !== "1") {
  throw new Error("Smoke tests must be run with `npm run test:smoke` (development database only).");
}

const BASE = process.env.DF_TEST_BASE_URL ?? "http://localhost:3000";
let browser: any = null;
let reachable = false;
let fx: Fixtures | null = null;

before(async () => {
  try {
    reachable = (await fetch(`${BASE}/api/auth/me`)).ok;
  } catch {
    reachable = false;
  }
  if (reachable) browser = await loadBrowser();
  if (reachable && browser) {
    await removeFixtures();
    fx = await createContext(BASE).create();
  }
});

after(async () => {
  await browser?.close();
  const left = fx ? await removeFixtures() : 0;
  await prisma.$disconnect();
  assert.equal(left, 0, "every phone-check account is removed");
});

test("phone layout: no sideways scrolling, off-screen, covered or overlapping elements", { timeout: 30 * 60_000 }, async (t) => {
  if (!reachable) return t.skip(`No server at ${BASE}.`);
  if (!browser || !fx) return t.skip("playwright-core or Edge/Chrome not installed: npm install --no-save playwright-core@1.48.2");
  const visits = smokeVisits(await buildVisits(fx));
  const results = await runAudit({ base: BASE, browser, fx, visits, sizes: SMOKE_SIZES });
  const errors = results.filter((result) => result.error);
  assert.deepEqual(errors.map((result) => `${result.screen} ${result.size}: ${result.error}`), [], "every screen loads");
  const blockers = blocking(results);
  assert.deepEqual(
    blockers.map((finding) => `${finding.screen} ${finding.size} ${finding.kind}: ${finding.target} ${finding.detail}`),
    [],
    "no blocking layout findings",
  );
});
