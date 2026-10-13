// Client-safe. The series color as the series page uses it: for the main
// button, genre chip, stars and the season pill. Each theme gets the series
// color only where it keeps at least 3:1 contrast on that theme's page
// background; otherwise the site accent (or, for stars, amber). Text on a
// filled accent is whichever of white/near-black reads better.

import type { CSSProperties } from "react";
import { PAPER_BACKGROUNDS, starColors } from "@/lib/engagement-rules";
import { DEFAULT_SERIES_ACCENT, contrastRatio, readableTextOn, seriesAccentHex } from "@/lib/series-color";

export const ACCENT_MIN_CONTRAST = 3;
const FALLBACK = { light: DEFAULT_SERIES_ACCENT, dark: "#8b5cf6" } as const;

export function seriesAccents(themeColor: string | null | undefined) {
  const color = seriesAccentHex(themeColor);
  const pick = (mode: "light" | "dark") =>
    color && contrastRatio(color, PAPER_BACKGROUNDS[mode]) >= ACCENT_MIN_CONTRAST ? color : FALLBACK[mode];
  const light = pick("light");
  const dark = pick("dark");
  const stars = starColors(themeColor);
  return {
    light,
    dark,
    lightInk: readableTextOn(light),
    darkInk: readableTextOn(dark),
    starLight: stars.light,
    starDark: stars.dark,
    /** The raw series color (or the default) for decorative gradients. */
    base: color ?? DEFAULT_SERIES_ACCENT,
  };
}

/** CSS variables for a `.series-accent` scope (see app/globals.css). */
export function seriesAccentStyle(themeColor: string | null | undefined): CSSProperties {
  const accent = seriesAccents(themeColor);
  return {
    "--sa-light": accent.light,
    "--sa-dark": accent.dark,
    "--sa-ink-light": accent.lightInk,
    "--sa-ink-dark": accent.darkInk,
    "--star-fill-light": accent.starLight,
    "--star-fill-dark": accent.starDark,
  } as CSSProperties;
}

/** Mixes a hex color toward black (amount 0-1). */
export function darken(hex: string, amount: number) {
  const value = seriesAccentHex(hex) ?? DEFAULT_SERIES_ACCENT;
  const channels = [1, 3, 5].map((i) => Math.round(parseInt(value.slice(i, i + 2), 16) * (1 - amount)));
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The generated picture for an episode without an image: a gradient of the
 * series color, angled by the episode number so neighbours differ. Same input,
 * same picture; no image file involved.
 */
export function placeholderGradient(themeColor: string | null | undefined, episodeNumber: number) {
  const base = seriesAccentHex(themeColor) ?? DEFAULT_SERIES_ACCENT;
  const angle = (episodeNumber * 47) % 360;
  return `linear-gradient(${angle}deg, ${darken(base, 0.15)} 0%, ${darken(base, 0.55)} 55%, ${darken(base, 0.82)} 100%)`;
}
