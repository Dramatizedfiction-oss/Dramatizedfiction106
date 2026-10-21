import { Prisma } from "@prisma/client";

/*
 * Which series may appear in the feed, Explore and the series page's rows
 * (Sweep C). Server-only SQL, for a query where the series is aliased `s`.
 * A series is eligible only when all of these hold:
 *   - it is published and has at least one published episode;
 *   - its moderation status is VISIBLE (never IN_REVIEW, HELD or BLOCKED;
 *     BLOCKED also stands for hidden/removed);
 *   - its writer has no active ban or discipline action (MemberRestriction:
 *     not lifted, and permanent or not yet ended).
 */
export function eligibleSeries() {
  return Prisma.sql`(
    s.status = 'PUBLISHED'
    AND s."moderationStatus" = 'VISIBLE'
    AND EXISTS (SELECT 1 FROM "Episode" pe WHERE pe."seriesId" = s.id AND pe.status = 'PUBLISHED')
    AND NOT EXISTS (
      SELECT 1 FROM "MemberRestriction" mr
      WHERE mr."userId" = s."authorId" AND mr."liftedAt" IS NULL AND (mr."endsAt" IS NULL OR mr."endsAt" > now())
    )
    AND ${contentRatingAllowed()}
  )`;
}

/**
 * CONTENT RATING HOOK. Phase 1 has no mature or explicit content, so every
 * series passes. When content ratings exist, filter here (for example by the
 * viewer's age confirmation) and mark PoolSeries.isMature so the composer's
 * MATURE_FEED_CAP applies.
 */
function contentRatingAllowed() {
  return Prisma.sql`TRUE`;
}

export type EligibilityFacts = {
  status: string;
  moderationStatus: string;
  publishedEpisodes: number;
  authorRestricted: boolean;
};

/** Plain-language reasons a series is not eligible (empty when it is). Pure. */
export function ineligibleReasons(facts: EligibilityFacts): string[] {
  const reasons: string[] = [];
  if (facts.status !== "PUBLISHED") reasons.push("The series isn't published.");
  if (facts.publishedEpisodes === 0) reasons.push("It has no published episodes.");
  if (facts.moderationStatus !== "VISIBLE") reasons.push(`Its moderation status is ${facts.moderationStatus.replace("_", " ").toLowerCase()}.`);
  if (facts.authorRestricted) reasons.push("Its writer is banned or under discipline.");
  return reasons;
}
