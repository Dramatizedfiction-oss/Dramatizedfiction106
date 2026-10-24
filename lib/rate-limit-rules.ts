// Client-safe limits for lib/rate-limit.ts. Pure: no database.

export type RateLimitWindow = { windowMs: number; max: number };

/** Following and unfollowing (series and writers together), per member. */
export const FOLLOW_RATE_LIMITS: readonly RateLimitWindow[] = [
  { windowMs: 60_000, max: 30 },
  { windowMs: 60 * 60_000, max: 300 },
];

/** Rating and clearing ratings, per member (Sweep C: ratings feed Trending and Top Rated). */
export const RATING_RATE_LIMITS: readonly RateLimitWindow[] = [
  { windowMs: 60_000, max: 20 },
  { windowMs: 60 * 60_000, max: 200 },
];

/** Bookmarking and removing bookmarks, per member (Sweep C: bookmarks feed Trending). */
export const BOOKMARK_RATE_LIMITS: readonly RateLimitWindow[] = [
  { windowMs: 60_000, max: 20 },
  { windowMs: 60 * 60_000, max: 200 },
];

/**
 * Failed sign-ins, per account (Sweep E): over either window, sign-in for that
 * account is refused with 429 before the password is checked.
 */
export const LOGIN_FAILURE_LIMITS: readonly RateLimitWindow[] = [
  { windowMs: 15 * 60_000, max: 10 },
  { windowMs: 24 * 60 * 60_000, max: 50 },
];

/** True when any window already holds `max` hits (so one more would go over). */
export function overRateLimit(countsByWindow: number[], limits: readonly RateLimitWindow[]) {
  return limits.some((limit, index) => (countsByWindow[index] ?? 0) >= limit.max);
}
