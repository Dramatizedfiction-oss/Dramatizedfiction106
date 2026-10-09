/*
 * AI TAG BANNER: the one place to change how AI usage tags look, site-wide.
 * Every AI tag is drawn by components/AiTagBanner.tsx using these values.
 * Save the file and the dev server hot-reloads; nothing else needs editing.
 *
 * SHAPE      `shape` picks one entry from `shapes` below. Each shape is a CSS
 *            clip-path built from `size.notchPx` (how deep the cut is). Add your
 *            own by copying one; polygon points run clockwise from top-left.
 *            `notchAtBottom: true` adds bottom padding so text clears the cut.
 * SIZE       `size`: height, font size, letter spacing, side padding, notch
 *            depth and the darker "fold" strip along the top (0 hides it).
 * COLORS     `levels.<tag>.light` / `.dark`: background, text and fold color
 *            for each theme. Keep text-on-background contrast at 4.5:1 or more
 *            (tests/unit/ai-tag-banner.test.ts checks it on `npm test`).
 * WORDING    `levels.<tag>.label`: the visible text. `uppercase` sets the case.
 *            Screen readers hear "AI usage: <label>. <description>".
 * ANIMATION  `animation`: the drop-open ("unfurl") played when a banner first
 *            appears. `enabled: false` turns it off everywhere; people with
 *            "reduce motion" always get it already open. `replayOnScroll`
 *            unfurls banners further down the page as they scroll into view.
 *
 * The four levels are the real AiUsageTag values (lib/ai-usage.ts). Don't add
 * or rename levels here; this file only changes how they look.
 */

import type { AiUsageTag } from "@/lib/ai-usage";

export type AiTagBannerColors = {
  /** Banner fill. */
  background: string;
  /** Label text. Needs at least 4.5:1 contrast with `background`. */
  text: string;
  /** The thin strip along the top edge, where the banner "hangs". */
  fold: string;
};

export type AiTagBannerShape = {
  clipPath: (notchPx: number) => string;
  notchAtBottom: boolean;
};

export const AI_TAG_BANNER = {
  /** One of the keys in `shapes`. */
  shape: "pennant",

  shapes: {
    /** Flat top, shallow V cut up into the bottom edge: a hanging pennant. */
    pennant: {
      clipPath: (n: number) => `polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - ${n}px), 0 100%)`,
      notchAtBottom: true,
    },
    /** Classic ribbon: V notches cut into both ends. */
    swallowtail: {
      clipPath: (n: number) =>
        `polygon(0 0, 100% 0, calc(100% - ${n}px) 50%, 100% 100%, 0 100%, ${n}px 50%)`,
      notchAtBottom: false,
    },
    /** Flag: notch on the right end only. */
    flag: {
      clipPath: (n: number) => `polygon(0 0, 100% 0, calc(100% - ${n}px) 50%, 100% 100%, 0 100%)`,
      notchAtBottom: false,
    },
    /** Hanging tab: square top, rounded bottom corners. */
    tab: {
      clipPath: (n: number) => `inset(0 round 0 0 ${n + 2}px ${n + 2}px)`,
      notchAtBottom: false,
    },
  } satisfies Record<string, AiTagBannerShape>,

  size: {
    /** Height of the banner body, before any bottom notch. */
    heightPx: 18,
    fontSizePx: 9.5,
    fontWeight: 700,
    letterSpacingEm: 0.16,
    paddingXPx: 9,
    notchPx: 4,
    foldPx: 2,
    fontFamily: "var(--font-mono)",
  },

  uppercase: true,

  /** Subtle top-down shading so the banner looks like it drops from a fold. 0 to 1. */
  sheen: 0.16,

  levels: {
    "AI FREE": {
      label: "AI Free",
      light: { background: "#047857", text: "#ffffff", fold: "#064e3b" },
      dark: { background: "#34d399", text: "#052e22", fold: "#059669" },
    },
    "AI CORRECTED": {
      label: "AI Corrected",
      light: { background: "#1d4ed8", text: "#ffffff", fold: "#1e3a8a" },
      dark: { background: "#93c5fd", text: "#0b1b3a", fold: "#3b82f6" },
    },
    "AI HEAVY": {
      label: "AI Heavy",
      light: { background: "#b45309", text: "#ffffff", fold: "#78350f" },
      dark: { background: "#fbbf24", text: "#3a2203", fold: "#d97706" },
    },
    "AI WRITTEN": {
      label: "AI Written",
      light: { background: "#be123c", text: "#ffffff", fold: "#881337" },
      dark: { background: "#fda4af", text: "#4c0519", fold: "#e11d48" },
    },
  } satisfies Record<AiUsageTag, { label: string; light: AiTagBannerColors; dark: AiTagBannerColors }>,

  animation: {
    enabled: true,
    /** Time for the banner to drop fully open. */
    durationMs: 520,
    /** Wait before it starts, after it appears. */
    delayMs: 60,
    /** The overshoot (1.35) gives the little "snap" at the end; use "ease-out" for none. */
    easing: "cubic-bezier(0.22, 1.35, 0.36, 1)",
    replayOnScroll: true,
  },
};
