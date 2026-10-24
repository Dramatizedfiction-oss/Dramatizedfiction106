import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { EMAIL_MAX, PASSWORD_MAX, normalizeEmail } from "@/lib/account-rules";
import { LOGIN_FAILURE_LIMITS, overRateLimit } from "@/lib/rate-limit-rules";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Sweep E: sign-in and sign-up limits", () => {
  test("emails are trimmed, lower-cased and must look like an address", () => {
    assert.equal(normalizeEmail("  Reader@Example.COM "), "reader@example.com");
    assert.equal(normalizeEmail("no-at-sign"), null);
    assert.equal(normalizeEmail("a@b"), null);
    assert.equal(normalizeEmail("two words@example.com"), null);
    assert.equal(normalizeEmail(42), null);
    assert.equal(normalizeEmail(`${"a".repeat(EMAIL_MAX)}@x.io`), null);
  });

  test("failed sign-ins lock an account after the short window fills", () => {
    const [short, day] = LOGIN_FAILURE_LIMITS;
    assert.equal(overRateLimit([short.max - 1, 0], LOGIN_FAILURE_LIMITS), false);
    assert.equal(overRateLimit([short.max, 0], LOGIN_FAILURE_LIMITS), true);
    assert.equal(overRateLimit([0, day.max], LOGIN_FAILURE_LIMITS), true);
    assert.ok(PASSWORD_MAX >= 64);
  });

  test("sign-in checks the lock before the password and records only failures", () => {
    const login = read("app/api/auth/login/route.ts");
    const locked = login.indexOf("isRateLimited(");
    const compare = login.indexOf("comparePassword(password");
    assert.ok(locked > 0 && compare > locked, "lock is checked before the password");
    assert.match(login, /recordRateLimitHit\(user\.id, LOGIN_FAILURE\)/);
    assert.match(read("app/api/auth/register/route.ts"), /normalizeEmail\(rawEmail\)/);
  });

  test("surface types live in one place, and the legal page uses them", () => {
    const css = read("app/globals.css");
    for (const name of ["surface-prose", "surface-callout", "surface-note", "surface-group", "surface-row", "surface-facts", "surface-section", "surface-feature"]) {
      assert.match(css, new RegExp(`\\.${name}\\s*\\{`), name);
    }
    assert.match(css, /--radius-card:/);
    assert.match(css, /\.dark \{[\s\S]*--callout-bg:/);
    const legal = read("components/legal/LegalPage.tsx");
    assert.match(legal, /Jump to section/);
    assert.doesNotMatch(legal, /On this page/);
    assert.match(legal, /<Callout/);
    assert.match(read("components/content/RenderedMarkdown.tsx"), /case "quote":[\s\S]*surface-callout/);
  });

  test("/api/auth/me treats signed out as a normal answer", () => {
    const me = read("app/api/auth/me/route.ts");
    assert.match(me, /return NextResponse\.json\(\{ authenticated: false, user: null \}\);/);
  });
});
