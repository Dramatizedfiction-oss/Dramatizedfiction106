/*
 * Database-level checks for the administration services (development DB).
 */
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { getSiteAnalytics } from "@/lib/admin/analytics";
import { AUDIT, checkCeoPassword } from "@/lib/admin/audit";
import { moderateMember } from "@/lib/admin/moderation-service";
import { MAX_BOARD_MEMBERS } from "@/lib/admin/policy";
import { changeMemberRole } from "@/lib/admin/roles-service";
import { activatePhase } from "@/lib/ceo/phase-activation";
import { ensurePlatformSettingsId } from "@/lib/phases";
import { prisma } from "@/lib/prisma";
import { cleanup, makeUser } from "./helpers";

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Board seats", () => {
  test("concurrent promotions for the last seat: exactly one wins, the Board never exceeds six", async () => {
    const ceo = await makeUser("CEO", "seat-ceo");
    const existing = await prisma.user.count({ where: { role: "BOARD" } });
    const free = Math.max(0, MAX_BOARD_MEMBERS - existing);
    // Fill all but one seat one at a time, then race four requests for the last seat.
    // (Four keeps the race inside Prisma's local connection pool of five.)
    const fillers = await Promise.all(Array.from({ length: Math.max(0, free - 1) }, (_, i) => makeUser("WRITER", `seat-fill-${i}`)));
    for (const filler of fillers) assert.equal((await changeMemberRole(ceo.id, filler.id, "MAKE_BOARD")).ok, true);
    const racers = await Promise.all(Array.from({ length: 4 }, (_, i) => makeUser("WRITER", `seat-race-${i}`)));
    const candidates = [...fillers, ...racers];

    const results = await Promise.all(racers.map((candidate) => changeMemberRole(ceo.id, candidate.id, "MAKE_BOARD")));
    assert.equal(results.filter((result) => result.ok).length, free > 0 ? 1 : 0);
    assert.ok(results.filter((result) => !result.ok).every((result) => !result.ok && result.code === "BOARD_FULL"));
    assert.equal(await prisma.user.count({ where: { role: "BOARD" } }), MAX_BOARD_MEMBERS);

    // Removing restores the role they had (WRITER), recorded in the audit log.
    for (const candidate of candidates) {
      const current = await prisma.user.findUniqueOrThrow({ where: { id: candidate.id }, select: { role: true } });
      if (current.role === "BOARD") {
        const removed = await changeMemberRole(ceo.id, candidate.id, "REMOVE_BOARD");
        assert.deepEqual(removed, { ok: true, from: "BOARD", to: "WRITER" });
      }
    }
    assert.equal(await prisma.user.count({ where: { role: "BOARD" } }), existing);
  });

  test("a Board member can't change roles, even through the service", async () => {
    const board = await makeUser("BOARD", "board-actor");
    const target = await makeUser("READER", "board-target");
    const result = await changeMemberRole(board.id, target.id, "MAKE_CEO");
    assert.equal(result.ok, false);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).role, "READER");
  });
});

describe("moderation lifecycle", () => {
  test("ban stays until lifted; discipline ends by time without changing the role", async () => {
    const board = await makeUser("BOARD", "mod-board");
    const writer = await makeUser("WRITER", "mod-writer");

    const disciplined = await moderateMember({ actorId: board.id, targetId: writer.id, action: "DISCIPLINE", reason: "Test discipline" });
    assert.equal(disciplined.ok, true);
    const duplicate = await moderateMember({ actorId: board.id, targetId: writer.id, action: "DISCIPLINE", reason: "Again" });
    assert.equal(duplicate.ok, false);

    // Simulate the month passing: the restriction is no longer active and the role is unchanged.
    await prisma.memberRestriction.updateMany({ where: { userId: writer.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    const activeAfter = await prisma.memberRestriction.count({
      where: { userId: writer.id, liftedAt: null, OR: [{ kind: "BAN" }, { kind: "DISCIPLINE", endsAt: { gt: new Date() } }] },
    });
    assert.equal(activeAfter, 0);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: writer.id } })).role, "WRITER");

    const banned = await moderateMember({ actorId: board.id, targetId: writer.id, action: "BAN", reason: "Test ban" });
    assert.equal(banned.ok, true);
    if (banned.ok) assert.equal(banned.endsAt, null);
    const lifted = await moderateMember({ actorId: board.id, targetId: writer.id, action: "LIFT", reason: "" });
    assert.equal(lifted.ok, true);

    const audit = await prisma.adminAuditLog.findMany({ where: { targetUserId: writer.id }, select: { action: true, actorId: true } });
    assert.deepEqual(new Set(audit.map((entry) => entry.action)), new Set([AUDIT.DISCIPLINE, AUDIT.BAN, AUDIT.LIFT]));
    assert.ok(audit.every((entry) => entry.actorId === board.id));
  });

  test("Board can't moderate Board or CEO accounts", async () => {
    const board = await makeUser("BOARD", "mod-board2");
    const otherBoard = await makeUser("BOARD", "mod-board3");
    const ceo = await makeUser("CEO", "mod-ceo");
    for (const target of [otherBoard, ceo]) {
      const result = await moderateMember({ actorId: board.id, targetId: target.id, action: "BAN", reason: "Not allowed" });
      assert.equal(result.ok, false);
    }
    assert.equal(await prisma.memberRestriction.count({ where: { userId: { in: [otherBoard.id, ceo.id] } } }), 0);
  });
});

describe("CEO password", () => {
  test("wrong passwords never pass, are audited, and are throttled", async () => {
    const ceo = await makeUser("CEO", "pw-ceo");
    for (let i = 0; i < 5; i++) {
      const result = await checkCeoPassword(ceo.id, `wrong-${i}-password`);
      assert.equal(result.ok, false);
    }
    const throttled = await checkCeoPassword(ceo.id, process.env.CEO_PASSWORD);
    assert.equal(throttled.ok, false);
    if (!throttled.ok) assert.equal(throttled.code, "TOO_MANY_ATTEMPTS");
    const entries = await prisma.adminAuditLog.findMany({ where: { actorId: ceo.id }, select: { details: true } });
    assert.equal(entries.length, 5);
    assert.ok(entries.every((entry) => entry.details === null)); // nothing about the password is stored
  });
});

describe("phase activation", () => {
  test("not ready: nothing changes", async () => {
    const ceo = await makeUser("CEO", "phase-ceo");
    const id = await ensurePlatformSettingsId();
    const before = await prisma.settings.findUniqueOrThrow({ where: { id } });
    const result = await activatePhase(ceo.id, 2);
    assert.equal(result.ok, false);
    const afterRow = await prisma.settings.findUniqueOrThrow({ where: { id } });
    assert.equal(afterRow.phaseTwoUnlocked, before.phaseTwoUnlocked);
    assert.equal(afterRow.enablePayments, before.enablePayments);
  });

  test("ready (simulated): persists once, duplicates don't conflict", async () => {
    const ceo = await makeUser("CEO", "phase-ceo2");
    const id = await ensurePlatformSettingsId();
    const original = await prisma.settings.findUniqueOrThrow({ where: { id } });
    if (original.phaseThreeUnlocked) return; // never disturb a real activation
    const ready = () => ({ ready: true, requirements: [] });
    try {
      const results = await Promise.all([activatePhase(ceo.id, 3, ready), activatePhase(ceo.id, 3, ready), activatePhase(ceo.id, 3, ready)]);
      assert.ok(results.every((result) => result.ok));
      assert.equal(results.filter((result) => result.ok && !result.alreadyActive).length, 1);
      const row = await prisma.settings.findUniqueOrThrow({ where: { id } });
      assert.equal(row.phaseThreeUnlocked, true);
      assert.equal(row.enableAds, true);
      assert.ok(row.phaseThreeActivatedAt);
    } finally {
      await prisma.settings.update({
        where: { id },
        data: { phaseThreeUnlocked: original.phaseThreeUnlocked, enableAds: original.enableAds, phaseThreeActivatedAt: original.phaseThreeActivatedAt },
      });
    }
  });
});

describe("analytics", () => {
  test("figures match independent counts", async () => {
    const data = await getSiteAnalytics();
    const [readers, events, pairs] = await Promise.all([
      prisma.user.count({ where: { role: "READER" } }),
      prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM "ReadEvent"`,
      prisma.$queryRaw<{ n: bigint }[]>`SELECT COALESCE(SUM("readerCount"), 0) AS n FROM "Episode"`,
    ]);
    assert.equal(data.accounts.READER, readers);
    assert.equal(data.reads.events, Number(events[0].n));
    assert.equal(data.reads.uniqueReaderEpisodePairs, Number(pairs[0].n));
    assert.ok(data.reads.uniqueReaders <= data.reads.events);
  });
});
