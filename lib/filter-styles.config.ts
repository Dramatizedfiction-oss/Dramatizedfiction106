/*
 * FILTER STYLES: the look of every genre and sort option in Explore's drop-downs.
 * Edit a value here and it applies everywhere that option is drawn (closed
 * control, desktop popover, phone bottom sheet). Nothing else needs changing.
 *
 * Keys are the real option values: genres from lib/genres.ts plus "all", and the
 * sorts "trending" / "newest". Adding a key here does NOT add a filter option;
 * options come from lib/genres.ts. ("adventure" and "cozy" are ready for if
 * those genres are ever added.)
 *
 * label       Text shown for the option.
 * glyph       A character drawn before the label ("✦", "♥"), or "svg:magnifier" /
 *             "svg:flame" for the small built-in icons. Omit for none.
 * font        "body" (Inter), "serif" (Literata), "display" (Playfair), "mono"
 *             (Space Mono), or the system stacks "condensed", "rounded", "slab".
 *             No new font files are loaded; system stacks vary a little by device.
 * weight, italic, letterCase ("none" | "uppercase" | "small-caps"),
 * letterSpacingEm, tiltDeg    Typography.
 * light / dark  Colors per theme:
 *             text        one color, or a list of colors for gradient letters
 *             background  fill behind the label (omit for none)
 *             border      border color (with borderPx)
 *             accent      glyph, underline and rule color
 *             textShadow  any CSS text-shadow (solid-color text only)
 *             glow        color of the pulsing glow (effect "glow-pulse")
 * decoration  "none" | "line" (underline of lineThicknessPx) | "double-rule"
 *             (thin lines above and below) | "hazard" (diagonal stripes under).
 * notchedCorner  Clips the top-right corner (pairs with borderPx).
 * effect      "none" | "shimmer" (gradient drifts) | "flicker" | "glow-pulse".
 * animate     false freezes the effect and any glyph pop/bounce for that option.
 * hover       "bounce" makes it hop when the row is hovered.
 * popGlyphOnSelect  The glyph pops once when this option becomes selected.
 * durationMs  Effect speed.
 *
 * Contrast: every text color (and every gradient stop) is checked at 4.5:1
 * against its background in both themes by tests/unit/filter-styles.test.ts.
 * Without a `background`, the label sits on the drop-down surface:
 * SURFACE.light / SURFACE.dark below (keep them equal to --surface-raised).
 * Everyone with "reduce motion" on gets the static version automatically.
 */

export const SURFACE = { light: "#ffffff", dark: "#1c1b25" } as const;

export type FilterFont = "body" | "serif" | "display" | "mono" | "condensed" | "rounded" | "slab";

export type FilterThemeColors = {
  text: string | string[];
  background?: string;
  border?: string;
  accent?: string;
  textShadow?: string;
  glow?: string;
};

export type FilterStyle = {
  label: string;
  glyph?: string;
  font: FilterFont;
  weight: number;
  italic?: boolean;
  letterCase?: "none" | "uppercase" | "small-caps";
  letterSpacingEm?: number;
  tiltDeg?: number;
  light: FilterThemeColors;
  dark: FilterThemeColors;
  decoration?: "none" | "line" | "double-rule" | "hazard";
  lineThicknessPx?: number;
  borderPx?: number;
  notchedCorner?: boolean;
  effect?: "none" | "shimmer" | "flicker" | "glow-pulse";
  animate?: boolean;
  hover?: "none" | "bounce";
  popGlyphOnSelect?: boolean;
  durationMs?: number;
};

export const GENRE_STYLES: Record<string, FilterStyle> = {
  all: {
    label: "All genres",
    glyph: "⁂",
    font: "body",
    weight: 600,
    light: { text: "#111118", accent: "#6d28d9" },
    dark: { text: "#f3f1f8", accent: "#c4b5fd" },
  },
  fantasy: {
    label: "Fantasy",
    glyph: "✦",
    font: "serif",
    italic: true,
    weight: 600,
    // Rainbow deepened in light mode (gold → #a16207) so every stop stays readable on white.
    light: { text: ["#6d28d9", "#1d4ed8", "#15803d", "#a16207", "#be185d"], accent: "#6d28d9" },
    dark: { text: ["#c4b5fd", "#93c5fd", "#86efac", "#fde68a", "#f9a8d4"], accent: "#c4b5fd" },
    effect: "shimmer",
    durationMs: 7000,
    animate: true,
  },
  "sci-fi": {
    label: "Sci-Fi",
    font: "mono",
    weight: 700,
    letterCase: "uppercase",
    letterSpacingEm: 0.2,
    // Black in both themes on purpose.
    light: { text: "#22d3ee", background: "#05070a", border: "#22d3ee" },
    dark: { text: "#22d3ee", background: "#05070a", border: "#22d3ee" },
    borderPx: 2,
    notchedCorner: true,
  },
  romance: {
    label: "Romance",
    glyph: "♥",
    font: "serif",
    italic: true,
    weight: 400,
    light: { text: ["#9f1239", "#be185d"], accent: "#e11d48" },
    dark: { text: ["#fda4af", "#fbcfe8"], accent: "#fb7185" },
  },
  horror: {
    label: "Horror",
    font: "condensed",
    weight: 700,
    letterCase: "uppercase",
    letterSpacingEm: 0.08,
    // Faint "drip": a short shadow straight down, kept light so letters stay crisp.
    light: { text: "#b91c1c", textShadow: "0 2px 1px rgba(185,28,28,0.18)" },
    dark: { text: "#f87171", textShadow: "0 2px 1px rgba(127,29,29,0.75)" },
    effect: "flicker",
    durationMs: 5200,
    animate: true,
  },
  mystery: {
    label: "Mystery",
    glyph: "svg:magnifier",
    font: "serif",
    weight: 600,
    letterCase: "small-caps",
    letterSpacingEm: 0.12,
    light: { text: "#334155", accent: "#ca8a04" },
    dark: { text: "#cbd5e1", accent: "#eab308" },
    decoration: "line",
    lineThicknessPx: 1,
  },
  thriller: {
    label: "Thriller",
    font: "condensed",
    weight: 800,
    letterCase: "uppercase",
    letterSpacingEm: 0.06,
    light: { text: "#1c1917", background: "#f59e0b", accent: "#1c1917" },
    dark: { text: "#1c1917", background: "#f59e0b", accent: "#1c1917" },
    decoration: "hazard",
  },
  comedy: {
    label: "Comedy",
    font: "rounded",
    weight: 800,
    tiltDeg: -2,
    // Bright yellow can't be read on white, so light mode uses deep orange/amber.
    light: { text: ["#c2410c", "#b45309"] },
    dark: { text: ["#fde047", "#fdba74"] },
    hover: "bounce",
    animate: true,
  },
  drama: {
    label: "Drama",
    font: "display",
    weight: 400,
    letterSpacingEm: 0.02,
    light: { text: "#701a45", accent: "#9d174d" },
    dark: { text: "#f0a6ca", accent: "#f472b6" },
    decoration: "double-rule",
  },
  historical: {
    label: "Historical",
    glyph: "❦",
    font: "serif",
    weight: 600,
    letterCase: "small-caps",
    letterSpacingEm: 0.06,
    light: { text: "#92400e", background: "#fbf3e2", accent: "#b45309" },
    dark: { text: "#e8c590", background: "#2a2218", accent: "#d6a35c" },
  },
  literary: {
    label: "Literary",
    font: "serif",
    italic: true,
    weight: 400,
    light: { text: "#111118", accent: "#111118" },
    dark: { text: "#f3f1f8", accent: "#f3f1f8" },
    decoration: "line",
    lineThicknessPx: 1,
  },
  adventure: {
    label: "Adventure",
    glyph: "◆",
    font: "slab",
    weight: 700,
    light: { text: ["#166534", "#c2410c"], accent: "#166534" },
    dark: { text: ["#86efac", "#fdba74"], accent: "#86efac" },
  },
  cozy: {
    label: "Cozy",
    glyph: "❧",
    font: "rounded",
    weight: 600,
    light: { text: "#9a3412", background: "#fff3e6", accent: "#c2410c" },
    dark: { text: "#fdba74", background: "#2b2019", accent: "#fb923c" },
  },
};

export const SORT_STYLES: Record<string, FilterStyle> = {
  trending: {
    label: "Trending",
    glyph: "svg:flame",
    font: "body",
    weight: 700,
    light: { text: ["#c2410c", "#b91c1c"], accent: "#ea580c", glow: "rgba(249,115,22,0.28)" },
    dark: { text: ["#fdba74", "#f87171"], accent: "#fb923c", glow: "rgba(249,115,22,0.38)" },
    effect: "glow-pulse",
    durationMs: 2400,
    animate: true,
  },
  newest: {
    label: "Newest",
    glyph: "✦",
    font: "body",
    weight: 600,
    letterSpacingEm: 0.01,
    light: { text: ["#047857", "#4d7c0f"], accent: "#059669" },
    dark: { text: ["#6ee7b7", "#bef264"], accent: "#6ee7b7" },
    popGlyphOnSelect: true,
    animate: true,
  },
};

/** Used for any option without an entry above. */
export const FALLBACK_STYLE: FilterStyle = {
  label: "",
  font: "body",
  weight: 600,
  light: { text: "#111118" },
  dark: { text: "#f3f1f8" },
};
