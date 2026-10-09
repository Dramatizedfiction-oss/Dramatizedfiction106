import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  MAX_BOARD_MEMBERS,
  activeRestriction,
  canBypassRenovation,
  decideModeration,
  decideRoleChange,
  disciplineEndsAt,
  isRenovationOpenApi,
  isRenovationOpenPath,
  restoreRole,
  type RestrictionRecord,
  type RoleChangeInput,
} from "@/lib/admin/policy";

const ceo = { id: "ceo", role: "CEO" };
const base = (overrides: Partial<RoleChangeInput>): RoleChangeInput => ({
  actor: ceo,
  target: { id: "t", role: "WRITER" },
  change: "MAKE_BOARD",
  boardCount: 0,
  ceoCount: 1,
  previousRole: null,
  targetHasWriterHistory: true,
  ...overrides,
});

describe("Board and CEO role changes", () => {
  test("only a CEO can change roles (Board, Writer and Reader are refused)", () => {
    for (const role of ["BOARD", "WRITER", "READER", "ADMIN", "AUTHOR"]) {
      for (const change of ["MAKE_BOARD", "REMOVE_BOARD", "MAKE_CEO", "REMOVE_CEO"] as const) {
        const decision = decideRoleChange(base({ actor: { id: "x", role }, change, target: { id: "t", role: "BOARD" } }));
        assert.equal(decision.ok, false, `${role} ${change}`);
        if (!decision.ok) assert.equal(decision.code, "FORBIDDEN");
      }
    }
  });

  test("the Board is capped at six", () => {
    assert.equal(MAX_BOARD_MEMBERS, 6);
    assert.equal(decideRoleChange(base({ boardCount: 5 })).ok, true);
    const full = decideRoleChange(base({ boardCount: 6 }));
    assert.equal(full.ok, false);
    if (!full.ok) assert.equal(full.code, "BOARD_FULL");
  });

  test("the last CEO can't be removed", () => {
    const last = decideRoleChange(base({ change: "REMOVE_CEO", target: { id: "ceo", role: "CEO" }, ceoCount: 1 }));
    assert.equal(last.ok, false);
    if (!last.ok) assert.equal(last.code, "LAST_CEO");
    assert.equal(decideRoleChange(base({ change: "REMOVE_CEO", target: { id: "c2", role: "CEO" }, ceoCount: 2 })).ok, true);
  });

  test("removing Board/CEO restores the previous role, never higher", () => {
    assert.deepEqual(decideRoleChange(base({ change: "REMOVE_BOARD", target: { id: "t", role: "BOARD" }, previousRole: "READER" })), {
      ok: true,
      from: "BOARD",
      to: "READER",
    });
    // A recorded previous role above what is being lost is ignored.
    assert.equal(restoreRole("CEO", false, "BOARD"), "READER");
    assert.equal(restoreRole(null, true, "BOARD"), "WRITER");
    assert.equal(restoreRole("BOARD", false, "CEO"), "BOARD");
  });

  test("a removed CEO doesn't fall back onto a full Board", () => {
    const decision = decideRoleChange(
      base({ change: "REMOVE_CEO", target: { id: "c", role: "CEO" }, ceoCount: 2, boardCount: 6, previousRole: "BOARD" }),
    );
    assert.deepEqual(decision, { ok: true, from: "CEO", to: "WRITER" });
  });

  test("invalid transitions are refused", () => {
    assert.equal(decideRoleChange(base({ change: "MAKE_BOARD", target: { id: "t", role: "BOARD" } })).ok, false);
    assert.equal(decideRoleChange(base({ change: "MAKE_BOARD", target: { id: "t", role: "CEO" } })).ok, false);
    assert.equal(decideRoleChange(base({ change: "REMOVE_BOARD", target: { id: "t", role: "WRITER" } })).ok, false);
    assert.equal(decideRoleChange(base({ change: "MAKE_CEO", target: { id: "t", role: "CEO" } })).ok, false);
  });
});

const day = 24 * 60 * 60 * 1000;
const record = (overrides: Partial<RestrictionRecord>): RestrictionRecord => ({
  id: "r",
  kind: "DISCIPLINE",
  imposedAt: new Date("2026-01-01T00:00:00Z"),
  endsAt: null,
  liftedAt: null,
  ...overrides,
});

describe("restrictions", () => {
  const now = new Date("2026-03-15T12:00:00Z");

  test("a ban stays active until lifted (no expiry)", () => {
    assert.equal(activeRestriction([record({ kind: "BAN" })], new Date("2099-01-01"))?.kind, "BAN");
    assert.equal(activeRestriction([record({ kind: "BAN", liftedAt: now })], now), null);
  });

  test("discipline is active until its end date, then expires on its own", () => {
    const endsAt = new Date(now.getTime() + day);
    assert.equal(activeRestriction([record({ endsAt })], now)?.kind, "DISCIPLINE");
    assert.equal(activeRestriction([record({ endsAt })], new Date(endsAt.getTime() + 1)), null);
    assert.equal(activeRestriction([record({ endsAt, liftedAt: now })], now), null);
  });

  test("a ban outranks a discipline action", () => {
    const active = activeRestriction(
      [record({ id: "d", endsAt: new Date(now.getTime() + day) }), record({ id: "b", kind: "BAN" })],
      now,
    );
    assert.equal(active?.id, "b");
  });

  test("discipline lasts one calendar month, clamped at month end", () => {
    assert.equal(disciplineEndsAt(new Date("2026-03-10T08:30:00Z")).toISOString(), "2026-04-10T08:30:00.000Z");
    assert.equal(disciplineEndsAt(new Date("2026-01-31T10:00:00Z")).toISOString(), "2026-02-28T10:00:00.000Z");
    assert.equal(disciplineEndsAt(new Date("2028-01-31T10:00:00Z")).toISOString(), "2028-02-29T10:00:00.000Z");
    assert.equal(disciplineEndsAt(new Date("2026-12-15T00:00:00Z")).toISOString(), "2027-01-15T00:00:00.000Z");
  });
});

describe("who may moderate whom", () => {
  const decide = (actorRole: string, targetRole: string, extra: Partial<Parameters<typeof decideModeration>[0]> = {}) =>
    decideModeration({
      actor: { id: "a", role: actorRole },
      target: { id: "t", role: targetRole },
      action: "BAN",
      current: null,
      reason: "Spam",
      ...extra,
    });

  test("readers and writers can't moderate", () => {
    assert.equal(decide("READER", "READER").ok, false);
    assert.equal(decide("WRITER", "READER").ok, false);
  });

  test("Board moderates readers and writers only", () => {
    assert.equal(decide("BOARD", "READER").ok, true);
    assert.equal(decide("BOARD", "WRITER").ok, true);
    assert.equal(decide("BOARD", "BOARD").ok, false);
    assert.equal(decide("BOARD", "CEO").ok, false);
  });

  test("CEO may moderate Board, never a CEO or themselves", () => {
    assert.equal(decide("CEO", "BOARD").ok, true);
    assert.equal(decide("CEO", "CEO").ok, false);
    assert.equal(
      decideModeration({ actor: { id: "same", role: "CEO" }, target: { id: "same", role: "WRITER" }, action: "BAN", current: null, reason: "x x" }).ok,
      false,
    );
  });

  test("a private reason is required; duplicates are refused", () => {
    assert.equal(decide("BOARD", "READER", { reason: "  " }).ok, false);
    assert.equal(decide("BOARD", "READER", { current: record({ kind: "BAN" }) }).ok, false);
    assert.equal(decide("BOARD", "READER", { action: "DISCIPLINE", current: record({ endsAt: new Date("2099-01-01") }) }).ok, false);
    assert.equal(decide("BOARD", "READER", { action: "LIFT", current: null }).ok, false);
    assert.equal(decide("BOARD", "READER", { action: "LIFT", current: record({ kind: "BAN" }), reason: "" }).ok, true);
  });
});

describe("renovation access", () => {
  test("only CEO and Board bypass renovation", () => {
    assert.equal(canBypassRenovation("CEO"), true);
    assert.equal(canBypassRenovation("BOARD"), true);
    assert.equal(canBypassRenovation("ADMIN"), true); // legacy alias of BOARD
    for (const role of ["WRITER", "READER", null, undefined, "", "ceo"]) assert.equal(canBypassRenovation(role), false, String(role));
  });

  test("only sign-in pages and session APIs stay open", () => {
    assert.equal(isRenovationOpenPath("/sign-in"), true);
    for (const path of ["/", "/explore", "/sign-up", "/sign-in-x", "/administration", "/writer-studio"]) {
      assert.equal(isRenovationOpenPath(path), false, path);
    }
    assert.equal(isRenovationOpenApi("/api/auth/login"), true);
    assert.equal(isRenovationOpenApi("/api/auth/register"), false);
    assert.equal(isRenovationOpenApi("/api/writer-studio/series"), false);
  });
});
