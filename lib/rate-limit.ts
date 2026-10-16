import { NextResponse } from "next/server";
import { ERROR_COPY } from "@/lib/error-copy";
import { prisma } from "@/lib/prisma";
import { overRateLimit, type RateLimitWindow } from "@/lib/rate-limit-rules";

/*
 * A per-member rate limit kept in the database (RateLimitHit rows), so it holds
 * across serverless instances. Each allowed action records one row; a member
 * over any window gets 429 and nothing is recorded. Rows older than a day are
 * pruned for that member as they act. Two requests racing can each pass at the
 * boundary; that's acceptable for a soft limit.
 */

const DAY_MS = 24 * 60 * 60_000;

/** Records the action and returns true, or returns false when the member is over a limit. */
export async function takeRateLimit(userId: string, action: string, limits: readonly RateLimitWindow[], now = new Date()) {
  const counts = await Promise.all(
    limits.map((limit) =>
      prisma.rateLimitHit.count({
        where: { userId, action, createdAt: { gt: new Date(now.getTime() - limit.windowMs) } },
      }),
    ),
  );
  if (overRateLimit(counts, limits)) return false;

  await prisma.$transaction([
    prisma.rateLimitHit.create({ data: { userId, action, createdAt: now } }),
    prisma.rateLimitHit.deleteMany({ where: { userId, action, createdAt: { lt: new Date(now.getTime() - DAY_MS) } } }),
  ]);
  return true;
}

export function rateLimitedResponse() {
  return NextResponse.json(
    { error: `${ERROR_COPY[429].title} Wait a moment, then try again.`, code: "RATE_LIMITED" },
    { status: 429 },
  );
}
