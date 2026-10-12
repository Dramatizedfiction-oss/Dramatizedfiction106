// Client-safe rules for bookmarks, ratings, comments and reports. Pure
// functions only; the services in lib/bookmarks.ts, lib/ratings.ts,
// lib/comments.ts and lib/reports.ts apply them on the server.

import { contrastRatio, seriesAccentHex } from "@/lib/series-color";

/** A series' rating is hidden until it has at least this many ratings. */
export const SERIES_RATING_MIN_COUNT = 3;

export const RATING_MIN = 1;
export const RATING_MAX = 5;

export const COMMENT_MAX_LENGTH = 1000;
export const COMMENT_PAGE_SIZE = 20;
/** Posting limits per member: at most `max` comments in each window. */
export const COMMENT_RATE_LIMITS = [
  { windowMs: 60_000, max: 5 },
  { windowMs: 60 * 60_000, max: 30 },
] as const;
/** The same text posted again on the same episode within this window is treated as a repeat tap. */
export const COMMENT_DUPLICATE_WINDOW_MS = 30_000;

export const BOOKMARK_PAGE_SIZE = 20;
export const ACTIVITY_PAGE_SIZE = 20;
export const REPORT_NOTE_MAX_LENGTH = 500;

export const REPORT_REASONS = [
  { value: "SPAM", label: "Spam or advertising" },
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "HATE", label: "Hate speech" },
  { value: "SEXUAL", label: "Sexual content" },
  { value: "SPOILERS", label: "Spoilers" },
  { value: "OTHER", label: "Something else" },
] as const;
export type ReportReasonValue = (typeof REPORT_REASONS)[number]["value"];

export function isReportReason(value: unknown): value is ReportReasonValue {
  return REPORT_REASONS.some((reason) => reason.value === value);
}

export function reportReasonLabel(value: string) {
  return REPORT_REASONS.find((reason) => reason.value === value)?.label ?? value;
}

/** A whole number of stars from 1 to 5, or null. */
export function parseRatingValue(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= RATING_MIN && value <= RATING_MAX ? value : null;
}

// Control characters except tab and newline.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g;

/**
 * Cleans comment text: normalizes line breaks, strips control and
 * direction-override characters, trims, and keeps at most one blank line in a
 * row. The result is stored and shown as plain text (never HTML).
 */
export function normalizeCommentBody(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type CommentBodyCheck = { ok: true; body: string } | { ok: false; message: string };

export function checkCommentBody(value: unknown): CommentBodyCheck {
  if (typeof value !== "string") return { ok: false, message: "Write a comment first." };
  const body = normalizeCommentBody(value);
  if (body.length === 0) return { ok: false, message: "Write a comment first." };
  if (body.length > COMMENT_MAX_LENGTH) {
    return { ok: false, message: `Comments can be up to ${COMMENT_MAX_LENGTH.toLocaleString("en-US")} characters.` };
  }
  return { ok: true, body };
}

/** Checks the counts of the member's recent comments against COMMENT_RATE_LIMITS. */
export function commentRateLimited(recentCreatedAt: Date[], now = Date.now()) {
  return COMMENT_RATE_LIMITS.some(
    ({ windowMs, max }) => recentCreatedAt.filter((date) => now - date.getTime() < windowMs).length >= max,
  );
}

/** Pooled series rating for display, or null while below SERIES_RATING_MIN_COUNT. */
export function seriesRatingSummary(average: number | null, count: number, minimum = SERIES_RATING_MIN_COUNT) {
  if (average === null || count < minimum) return null;
  const value = (Math.round(average * 10) / 10).toFixed(1);
  return {
    value,
    count,
    text: `${value} (${count.toLocaleString("en-US")} ${count === 1 ? "rating" : "ratings"})`,
    label: `Rated ${value} out of 5 from ${count.toLocaleString("en-US")} ${count === 1 ? "rating" : "ratings"}`,
  };
}

/** Reader paper backgrounds (app/globals.css --paper-bg, light and dark). */
export const PAPER_BACKGROUNDS = { light: "#fbfaf7", dark: "#131118" } as const;
/** Star fill when the series color is too faint against the paper (the warning tokens). */
export const STAR_FALLBACKS = { light: "#b45309", dark: "#fbbf24" } as const;
/** Minimum contrast for a filled star against the paper (WCAG 1.4.11, graphics). */
export const STAR_MIN_CONTRAST = 3;

/** Filled-star colors for light and dark: the series color where it reads well, else the fallback. */
export function starColors(themeColor: string | null | undefined) {
  const accent = seriesAccentHex(themeColor);
  const pick = (mode: "light" | "dark") =>
    accent && contrastRatio(accent, PAPER_BACKGROUNDS[mode]) >= STAR_MIN_CONTRAST ? accent : STAR_FALLBACKS[mode];
  return { light: pick("light"), dark: pick("dark") };
}

/** Short relative time ("just now", "5m", "3h", "2d", then a date). */
export function timeAgo(iso: string | Date, now = Date.now()) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const seconds = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
