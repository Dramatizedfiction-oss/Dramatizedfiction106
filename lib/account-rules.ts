// Pure Settings > Account rules (no database). Client-safe, so forms can give
// the same answers the server enforces.

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 40;
export const PASSWORD_MIN = 8;
/** The wording version recorded with an 18+ confirmation. Bump when the wording changes. */
export const AGE_CONFIRMATION_VERSION = "2026-10";
export const ADULT_AGE = 18;

/** Trims and collapses inner whitespace; null when outside 2–40 characters. */
export function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= DISPLAY_NAME_MIN && name.length <= DISPLAY_NAME_MAX ? name : null;
}

/**
 * A real calendar date from day/month/year parts, or null. Rejects impossible
 * dates (31 Feb), future dates and years before 1900.
 */
export function parseBirthDate(day: unknown, month: unknown, year: unknown, now = new Date()): Date | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (![d, m, y].every(Number.isInteger) || y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  if (date.getTime() > now.getTime()) return null;
  return date;
}

/** Whole years between a birth date and `now` (UTC calendar). */
export function ageOn(birth: Date, now = new Date()) {
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export const DELETE_CONFIRMATION_WORD = "DELETE";
