/*
 * Reading preferences, saved on this device only (no database), under one
 * localStorage key. Applied as data attributes on <html> before first paint by
 * READING_INIT_SCRIPT (like the theme), and read by CSS in app/globals.css
 * ("Reading preferences"): text size, line spacing and width apply to the
 * episode reader and Writer Studio preview (.reader-column); "always reduce"
 * motion applies site-wide. "default" values equal the original reading sizes.
 * Client-safe.
 */

export const READING_PREFS_KEY = "df-reading";

export const READING_OPTIONS = {
  size: ["sm", "default", "lg", "xl"],
  spacing: ["compact", "default", "relaxed"],
  width: ["narrow", "default", "wide"],
  motion: ["device", "always"],
} as const;

export type ReadingPrefs = { [K in keyof typeof READING_OPTIONS]: (typeof READING_OPTIONS)[K][number] };

export const DEFAULT_READING_PREFS: ReadingPrefs = { size: "default", spacing: "default", width: "default", motion: "device" };

/** <html> attribute for each preference. */
export const READING_ATTRIBUTES: Record<keyof ReadingPrefs, string> = {
  size: "data-reading-size",
  spacing: "data-reading-spacing",
  width: "data-reading-width",
  motion: "data-reduce-motion",
};

/** Keeps only known values; anything else falls back to the default. */
export function sanitizeReadingPrefs(value: unknown): ReadingPrefs {
  const input = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const result = { ...DEFAULT_READING_PREFS };
  for (const key of Object.keys(READING_OPTIONS) as (keyof ReadingPrefs)[]) {
    const options = READING_OPTIONS[key] as readonly string[];
    if (typeof input[key] === "string" && options.includes(input[key] as string)) {
      (result as Record<string, string>)[key] = input[key] as string;
    }
  }
  return result;
}

export function loadReadingPrefs(): ReadingPrefs {
  try {
    return sanitizeReadingPrefs(JSON.parse(window.localStorage.getItem(READING_PREFS_KEY) || "{}"));
  } catch {
    return { ...DEFAULT_READING_PREFS };
  }
}

export function applyReadingPrefs(prefs: ReadingPrefs) {
  const root = document.documentElement;
  for (const key of Object.keys(READING_ATTRIBUTES) as (keyof ReadingPrefs)[]) {
    root.setAttribute(READING_ATTRIBUTES[key], prefs[key]);
  }
}

export function saveReadingPrefs(prefs: ReadingPrefs) {
  applyReadingPrefs(prefs);
  try {
    window.localStorage.setItem(READING_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Private mode / storage blocked: the choice still applies to this page view.
  }
}

/** Inlined in <head>; self-contained, no imports, no user data. */
export const READING_INIT_SCRIPT = `(function(){try{var o=${JSON.stringify(READING_OPTIONS)},a=${JSON.stringify(
  READING_ATTRIBUTES,
)},d=${JSON.stringify(DEFAULT_READING_PREFS)},s={};try{s=JSON.parse(localStorage.getItem(${JSON.stringify(
  READING_PREFS_KEY,
)})||"{}")||{}}catch(e){}var r=document.documentElement;for(var k in a){var v=o[k].indexOf(s[k])>-1?s[k]:d[k];r.setAttribute(a[k],v)}}catch(e){}})();`;
