import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { IDLE_NUDGE_DAYS, decideContinueBlock, type ContinueInput } from "@/lib/writer-studio/continue-block";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-14T12:00:00Z");
const ago = (days: number) => new Date(now.getTime() - days * DAY);
const series = { id: "s1", title: "Lantern", status: "PUBLISHED" };
const draft = { id: "e1", title: "Part 2", episodeNumber: 2, lastSavedAt: ago(30), series };
const base: ContinueInput = { now, latestDraft: null, draftCount: 0, lastWritten: null, newestSeries: null };

describe("Continue writing block", () => {
  test("a draft wins, even when idle, with +N more", () => {
    const block = decideContinueBlock({ ...base, latestDraft: draft, draftCount: 3, lastWritten: { lastSavedAt: ago(30), series } });
    assert.equal(block?.kind, "draft");
    assert.equal(block?.kind === "draft" && block.moreDrafts, 2);
  });

  test("no draft: idle only after the threshold, on the last-worked-on series", () => {
    assert.equal(IDLE_NUDGE_DAYS, 7);
    assert.equal(decideContinueBlock({ ...base, lastWritten: { lastSavedAt: ago(6.9), series } }), null);
    const idle = decideContinueBlock({ ...base, lastWritten: { lastSavedAt: ago(7.1), series } });
    assert.deepEqual(idle, { kind: "idle", series, lastWrittenAt: ago(7.1) });
  });

  test("series but no episodes ever: nudge once the newest series is older than the threshold", () => {
    assert.equal(decideContinueBlock({ ...base, newestSeries: { ...series, createdAt: ago(2) } }), null);
    assert.deepEqual(decideContinueBlock({ ...base, newestSeries: { ...series, createdAt: ago(9) } }), {
      kind: "idle",
      series,
      lastWrittenAt: null,
    });
  });

  test("nothing at all: no block", () => {
    assert.equal(decideContinueBlock(base), null);
  });

  test("the threshold can be changed in one place", () => {
    assert.equal(decideContinueBlock({ ...base, lastWritten: { lastSavedAt: ago(3), series } }, 2)?.kind, "idle");
  });
});
