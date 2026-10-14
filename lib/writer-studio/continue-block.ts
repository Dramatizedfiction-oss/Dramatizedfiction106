/*
 * The "Continue writing" block on Writer Studio Home (Sweep 15). Pure and
 * client-safe; getStudioHome (lib/writer-studio/queries.ts) supplies the data.
 *
 * "Written" means an episode (draft or published) was created or edited:
 * Episode.lastSavedAt, set on creation, on every editor save and on publish.
 * Episode.updatedAt and Series.updatedAt are NOT used: a reader's first read
 * bumps them (readerCount / reads increments in lib/read-tracking.ts).
 *
 *   draft: an unpublished draft (DRAFT or REVIEW) exists -> the most recently
 *          edited one, plus "+N more drafts". Wins over idle.
 *   idle:  no drafts, and nothing written for more than IDLE_NUDGE_DAYS ->
 *          the last-worked-on series (the series of the newest edit). A writer
 *          who has series but never wrote an episode gets their newest series
 *          once it is older than the threshold.
 *   null:  otherwise; the block isn't rendered at all.
 */

/** Days without writing before Home gently suggests picking a series back up. */
export const IDLE_NUDGE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ContinueSeries = { id: string; title: string; status: string };

export type ContinueInput = {
  now: Date;
  /** The most recently edited unpublished draft, if any. */
  latestDraft: { id: string; title: string; episodeNumber: number; lastSavedAt: Date; series: ContinueSeries } | null;
  /** All unpublished drafts, including latestDraft. */
  draftCount: number;
  /** The writer's most recently edited episode of any status, if any. */
  lastWritten: { lastSavedAt: Date; series: ContinueSeries } | null;
  /** The writer's newest series by creation, for writers who never wrote an episode. */
  newestSeries: (ContinueSeries & { createdAt: Date }) | null;
};

export type ContinueBlock =
  | { kind: "draft"; draft: NonNullable<ContinueInput["latestDraft"]>; moreDrafts: number }
  | { kind: "idle"; series: ContinueSeries; lastWrittenAt: Date | null }
  | null;

export function decideContinueBlock(input: ContinueInput, idleDays = IDLE_NUDGE_DAYS): ContinueBlock {
  if (input.latestDraft) {
    return { kind: "draft", draft: input.latestDraft, moreDrafts: Math.max(0, input.draftCount - 1) };
  }
  const idleSince = input.now.getTime() - idleDays * DAY_MS;
  if (input.lastWritten) {
    return input.lastWritten.lastSavedAt.getTime() < idleSince
      ? { kind: "idle", series: input.lastWritten.series, lastWrittenAt: input.lastWritten.lastSavedAt }
      : null;
  }
  if (input.newestSeries && input.newestSeries.createdAt.getTime() < idleSince) {
    const { createdAt: _createdAt, ...series } = input.newestSeries;
    return { kind: "idle", series, lastWrittenAt: null };
  }
  return null;
}
