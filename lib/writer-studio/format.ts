// Client-safe presentation helpers for the Writer Studio.

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "3 hours ago", "just now". Timezone-independent, so safe on the server. */
export function formatRelative(value: Date | string | number, now = Date.now()) {
  const seconds = Math.round((new Date(value).getTime() - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }

  return "just now";
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count.toLocaleString()} ${count === 1 ? singular : pluralForm}`;
}

/** A series theme color, only if it is a plain hex color (it ends up in inline styles). */
export function safeHexColor(value: string | null | undefined, fallback = "#7c3aed") {
  return value && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim()) ? value.trim() : fallback;
}

/** Only http(s) image URLs are shown as covers. */
export function safeImageUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export const UNTITLED_EPISODE = "Untitled Episode";
export const UNTITLED_SERIES = "Untitled Series";
