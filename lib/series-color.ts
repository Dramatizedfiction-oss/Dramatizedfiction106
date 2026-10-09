// Client-safe helpers for painting UI with a series' theme color.

import { safeHexColor } from "@/lib/writer-studio/format";

/** The site's default accent, used when a series has no usable theme color. */
export const DEFAULT_SERIES_ACCENT = "#7c3aed";

const DARK_TEXT = "#111118";
const LIGHT_TEXT = "#ffffff";

/** A 6-digit lowercase hex for a stored theme color, or null if it isn't a plain hex. */
export function seriesAccentHex(value: string | null | undefined): string | null {
  const hex = safeHexColor(value, "");
  if (!hex) return null;
  const digits = hex.slice(1).toLowerCase();
  return `#${digits.length === 3 ? digits.replace(/./g, (d) => d + d) : digits}`;
}

/** WCAG relative luminance of a 6-digit hex color. */
function luminance(hex: string) {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG contrast ratio between two 6-digit hex colors (1 to 21). */
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** White or near-black, whichever reads better on the given background. */
export function readableTextOn(background: string) {
  return contrastRatio(background, LIGHT_TEXT) >= contrastRatio(background, DARK_TEXT)
    ? LIGHT_TEXT
    : DARK_TEXT;
}
