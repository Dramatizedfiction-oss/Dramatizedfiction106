// Client-safe formatting for administration and restriction notices.

const DATE_FORMAT: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };

export function formatRestrictionEnd(endsAt: string | Date | null | undefined) {
  if (!endsAt) return "an administrator lifts it";
  return new Date(endsAt).toLocaleDateString("en-US", DATE_FORMAT);
}

export function formatDate(value: string | Date | null | undefined) {
  return value ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

/** "12 days left", "less than a day left". */
export function remainingLabel(endsAt: string | Date, now: Date = new Date()) {
  const ms = new Date(endsAt).getTime() - now.getTime();
  if (ms <= 0) return "ended";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  return days >= 1 ? `${days} day${days === 1 ? "" : "s"} left` : "less than a day left";
}
