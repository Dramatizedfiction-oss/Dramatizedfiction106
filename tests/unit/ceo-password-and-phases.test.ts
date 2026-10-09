import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MIN_CEO_PASSWORD_LENGTH, verifyCeoPassword } from "@/lib/admin/ceo-password";
import { PHASE_IMPLEMENTATION, evaluatePhaseReadiness, parsePhase } from "@/lib/ceo/phase-readiness";

describe("CEO password verification", () => {
  const configured = "correct horse battery staple";

  test("missing or too-short configuration authorizes nothing", () => {
    assert.equal(verifyCeoPassword(configured, undefined), "NOT_CONFIGURED");
    assert.equal(verifyCeoPassword("", ""), "NOT_CONFIGURED");
    assert.equal(verifyCeoPassword("short", "short"), "NOT_CONFIGURED");
    assert.equal(verifyCeoPassword("x".repeat(MIN_CEO_PASSWORD_LENGTH - 1), "x".repeat(MIN_CEO_PASSWORD_LENGTH - 1)), "NOT_CONFIGURED");
  });

  test("wrong, empty or non-string passwords are rejected", () => {
    for (const attempt of ["wrong password!!", "", configured + " ", configured.toUpperCase(), null, undefined, 1234, {}]) {
      assert.equal(verifyCeoPassword(attempt, configured), "INVALID", String(attempt));
    }
  });

  test("the exact configured password is accepted", () => {
    assert.equal(verifyCeoPassword(configured, configured), "OK");
  });
});

describe("phase readiness", () => {
  const fullEnv = {
    STRIPE_SECRET_KEY: "sk_test_abc",
    STRIPE_WEBHOOK_SECRET: "whsec_abc",
    STRIPE_REFRESH_URL: "https://example.com/r",
    STRIPE_RETURN_URL: "https://example.com/s",
  };
  const allBuilt = Object.fromEntries(Object.keys(PHASE_IMPLEMENTATION).map((key) => [key, true])) as Record<
    keyof typeof PHASE_IMPLEMENTATION,
    boolean
  >;

  test("today neither phase can be activated, whatever the configuration", () => {
    assert.ok(Object.values(PHASE_IMPLEMENTATION).every((built) => built === false));
    assert.equal(evaluatePhaseReadiness(2, fullEnv).ready, false);
    assert.equal(evaluatePhaseReadiness(3, fullEnv).ready, false);
    assert.equal(evaluatePhaseReadiness(2, {}).ready, false);
  });

  test("Phase 2 also needs Stripe configuration", () => {
    assert.equal(evaluatePhaseReadiness(2, {}, allBuilt).ready, false);
    assert.equal(evaluatePhaseReadiness(2, { ...fullEnv, STRIPE_RETURN_URL: "http://insecure" }, allBuilt).ready, false);
    assert.equal(evaluatePhaseReadiness(2, { ...fullEnv, STRIPE_SECRET_KEY: "pk_test_wrong" }, allBuilt).ready, false);
    assert.equal(evaluatePhaseReadiness(2, fullEnv, allBuilt).ready, true);
  });

  test("Phase 3 needs a real ad provider and revenue accounting", () => {
    assert.equal(evaluatePhaseReadiness(3, {}, allBuilt).ready, true);
    assert.equal(evaluatePhaseReadiness(3, {}, { ...allBuilt, adProvider: false }).ready, false);
  });

  test("only phases 2 and 3 exist", () => {
    assert.equal(parsePhase("2"), 2);
    assert.equal(parsePhase("3"), 3);
    for (const value of ["1", "4", "", "two", null, "2 "]) assert.equal(parsePhase(value), null, String(value));
  });
});
