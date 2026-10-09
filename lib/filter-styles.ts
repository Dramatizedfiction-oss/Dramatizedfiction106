// Turns lib/filter-styles.config.ts entries into CSS custom properties and data
// attributes for components/explore/FilterOptionLabel.tsx. Display only.

import {
  FALLBACK_STYLE,
  GENRE_STYLES,
  SORT_STYLES,
  type FilterFont,
  type FilterStyle,
  type FilterThemeColors,
} from "@/lib/filter-styles.config";

const FONT_STACKS: Record<FilterFont, string> = {
  body: "var(--font-body)",
  serif: "var(--font-reading)",
  display: "var(--font-heading)",
  mono: "var(--font-mono)",
  // System condensed faces: Windows/macOS, iOS (PostScript names), Android.
  condensed:
    'Impact, "HelveticaNeue-CondensedBold", "AvenirNextCondensed-Bold", "Arial Narrow", "Roboto Condensed", "sans-serif-condensed", var(--font-body)',
  rounded: 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Varela Round", "Nunito", var(--font-body)',
  slab: 'Rockwell, "Roboto Slab", "American Typewriter", "Zilla Slab", Georgia, serif',
};

export function genreStyle(value: string): FilterStyle {
  return GENRE_STYLES[value] ?? { ...FALLBACK_STYLE, label: titleCase(value) };
}

export function sortStyle(value: string): FilterStyle {
  return SORT_STYLES[value] ?? { ...FALLBACK_STYLE, label: titleCase(value) };
}

/** "sci-fi" -> "Sci-Fi" */
export function titleCase(value: string) {
  return value.replace(/(^|-)(\w)/g, (_, sep: string, letter: string) => sep + letter.toUpperCase());
}

function themeVars(prefix: "l" | "d", colors: FilterThemeColors) {
  const gradient = Array.isArray(colors.text);
  const stops = Array.isArray(colors.text) ? colors.text : [colors.text];
  return {
    [`--fx-text-${prefix}`]: stops[0],
    // Repeat the first stop at the end so the shimmer loops seamlessly.
    [`--fx-grad-${prefix}`]: gradient ? [...stops, stops[0]].join(", ") : `${stops[0]}, ${stops[0]}`,
    [`--fx-bg-${prefix}`]: colors.background ?? "transparent",
    [`--fx-border-${prefix}`]: colors.border ?? "transparent",
    [`--fx-accent-${prefix}`]: colors.accent ?? stops[0],
    [`--fx-shadow-${prefix}`]: colors.textShadow ?? "none",
    [`--fx-glow-${prefix}`]: colors.glow ?? "transparent",
  };
}

/** Everything FilterOptionLabel needs: data attributes switch effects on, vars carry values. */
export function filterStyleModel(style: FilterStyle) {
  const gradient = Array.isArray(style.light.text) || Array.isArray(style.dark.text);
  const animate = style.animate !== false;

  return {
    label: style.label,
    glyph: style.glyph,
    attrs: {
      "data-fx-gradient": gradient ? "true" : undefined,
      "data-fx-block": style.light.background || style.dark.background ? "true" : undefined,
      "data-fx-decoration": style.decoration && style.decoration !== "none" ? style.decoration : undefined,
      "data-fx-notch": style.notchedCorner ? "true" : undefined,
      "data-fx-effect": animate && style.effect && style.effect !== "none" ? style.effect : undefined,
      "data-fx-hover": animate && style.hover === "bounce" ? "bounce" : undefined,
    },
    popGlyph: animate && Boolean(style.popGlyphOnSelect),
    style: {
      ...themeVars("l", style.light),
      ...themeVars("d", style.dark),
      "--fx-font": FONT_STACKS[style.font],
      "--fx-weight": String(style.weight),
      "--fx-style": style.italic ? "italic" : "normal",
      "--fx-case": style.letterCase === "uppercase" ? "uppercase" : "none",
      "--fx-variant": style.letterCase === "small-caps" ? "small-caps" : "normal",
      "--fx-stretch": style.font === "condensed" ? "condensed" : "normal",
      // Impact has no bold face; a faked bold smears it, so never synthesize there.
      "--fx-synthesis": style.font === "condensed" ? "none" : "weight style small-caps",
      "--fx-tracking": `${style.letterSpacingEm ?? 0}em`,
      "--fx-tilt": `${style.tiltDeg ?? 0}deg`,
      "--fx-border-w": `${style.borderPx ?? 0}px`,
      "--fx-line": `${style.lineThicknessPx ?? 1}px`,
      "--fx-dur": `${style.durationMs ?? 2400}ms`,
    } as Record<string, string>,
  };
}
