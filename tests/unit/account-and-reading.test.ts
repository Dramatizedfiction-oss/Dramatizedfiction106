import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { ageOn, normalizeDisplayName, parseBirthDate } from "@/lib/account-rules";
import { DEFAULT_READING_PREFS, READING_INIT_SCRIPT, sanitizeReadingPrefs } from "@/lib/reading-prefs";

const read = (path: string) => readFileSync(path, "utf8");

describe("account rules", () => {
  test("display names are trimmed, collapsed and 2-40 characters", () => {
    assert.equal(normalizeDisplayName("  Ada   Lovelace  "), "Ada Lovelace");
    assert.equal(normalizeDisplayName("A"), null);
    assert.equal(normalizeDisplayName("   "), null);
    assert.equal(normalizeDisplayName("x".repeat(40)), "x".repeat(40));
    assert.equal(normalizeDisplayName("x".repeat(41)), null);
    assert.equal(normalizeDisplayName(42), null);
  });

  test("birth dates must be real, past and after 1900", () => {
    const now = new Date(Date.UTC(2026, 9, 10));
    assert.ok(parseBirthDate("29", "2", "2004", now));
    assert.equal(parseBirthDate("29", "2", "2005", now), null, "not a leap year");
    assert.equal(parseBirthDate("31", "4", "2000", now), null);
    assert.equal(parseBirthDate("1", "1", "1899", now), null);
    assert.equal(parseBirthDate("11", "10", "2026", now), null, "future");
    assert.equal(parseBirthDate("", "1", "2000", now), null);
  });

  test("age turns 18 exactly on the 18th birthday", () => {
    const now = new Date(Date.UTC(2026, 9, 10));
    assert.equal(ageOn(parseBirthDate("10", "10", "2008", now)!, now), 18);
    assert.equal(ageOn(parseBirthDate("11", "10", "2008", now)!, now), 17);
  });
});

describe("reading preferences", () => {
  test("unknown or missing values fall back to the defaults", () => {
    assert.deepEqual(sanitizeReadingPrefs(null), DEFAULT_READING_PREFS);
    assert.deepEqual(sanitizeReadingPrefs({ size: "huge", spacing: "relaxed" }), { ...DEFAULT_READING_PREFS, spacing: "relaxed" });
  });

  test("the pre-paint script is self-contained and only sets known attributes", () => {
    assert.doesNotMatch(READING_INIT_SCRIPT, /import|require|fetch|document\.cookie/);
    assert.match(READING_INIT_SCRIPT, /data-reading-size/);
  });
});

describe("account routes (structure)", () => {
  const routes = [
    "app/api/me/account/route.ts",
    "app/api/me/account/name/route.ts",
    "app/api/me/account/age/route.ts",
    "app/api/me/account/password/route.ts",
  ];

  test("every account route signs the caller in and takes no user id", () => {
    for (const route of routes) {
      const source = read(route);
      assert.match(source, /await requireApiUser\(\)[\s\S]*?if \(!guard\.ok\) return guard\.response/, route);
      assert.doesNotMatch(source, /params\.userId|body\.data\.userId|searchParams/, route);
    }
  });

  test("the birthdate is never stored or logged", () => {
    const route = read("app/api/me/account/age/route.ts");
    const service = read("lib/account-service.ts");
    assert.doesNotMatch(route, /console\.\w+\([^)]*(birth|body)/);
    // No birth-date field is ever written (comments may mention it).
    assert.doesNotMatch(service, /birth\w*\s*[:=]/i);
    assert.doesNotMatch(route, /data:\s*\{[^}]*birth/i);
    assert.match(service, /ageConfirmedAt: now, ageConfirmationVersion/);
  });

  test("deletion checks the password, keeps the last CEO, and shares the role-change lock", () => {
    const service = read("lib/account-service.ts");
    const fn = service.slice(service.indexOf("export async function deleteAccount"));
    assert.ok(fn.indexOf("checkPassword(") < fn.indexOf("tx.user.delete("));
    assert.match(fn, /pg_advisory_xact_lock\(hashtext\('df:role-change'\)\)/);
    assert.match(fn, /LAST_CEO/);
  });

  test("display name is no longer accepted by the profile route", () => {
    assert.doesNotMatch(read("app/api/me/profile/route.ts"), /^\s*name: z\./m);
  });
});
