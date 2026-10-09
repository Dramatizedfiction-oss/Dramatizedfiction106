// Display-only helpers for components/AiTagBanner.tsx. Reads lib/ai-tag-banner.config.ts;
// never used when saving tags (that is lib/ai-usage.ts).

import { AI_TAG_BANNER, type AiTagBannerShape } from "@/lib/ai-tag-banner.config";
import { AI_USAGE_OPTIONS, aiUsageDescription, type AiUsageTag } from "@/lib/ai-usage";

/**
 * The level a stored or UI tag value shows as ("AI_HEAVY" or "AI HEAVY" → "AI HEAVY").
 * Missing or unrecognised values return null so no banner is shown, rather than
 * claiming "AI FREE" for content that has no tag (e.g. author books).
 */
export function displayedAiTag(value: string | null | undefined): AiUsageTag | null {
  const spaced = value?.trim().toUpperCase().replaceAll("_", " ");
  return AI_USAGE_OPTIONS.find((option) => option === spaced) ?? null;
}

/** Everything the banner needs for one tag, as CSS custom properties plus text. */
export function aiTagBannerModel(value: string | null | undefined) {
  const tag = displayedAiTag(value);
  if (!tag) return null;

  const { size, levels, animation, sheen } = AI_TAG_BANNER;
  const shapes: Record<string, AiTagBannerShape> = AI_TAG_BANNER.shapes;
  const shape = shapes[AI_TAG_BANNER.shape] ?? AI_TAG_BANNER.shapes.pennant;
  const level = levels[tag];
  const notchPad = shape.notchAtBottom ? size.notchPx : 0;
  const description = aiUsageDescription(tag);

  return {
    tag,
    label: level.label,
    description,
    accessibleName: `AI usage: ${level.label}. ${description}`,
    animate: animation.enabled,
    replayOnScroll: animation.enabled && animation.replayOnScroll,
    style: {
      "--aib-h": `${size.heightPx + notchPad}px`,
      "--aib-pad-x": `${size.paddingXPx}px`,
      "--aib-pad-top": `${size.foldPx}px`,
      "--aib-pad-bottom": `${notchPad}px`,
      "--aib-font": size.fontFamily,
      "--aib-fs": `${size.fontSizePx}px`,
      "--aib-fw": String(size.fontWeight),
      "--aib-ls": `${size.letterSpacingEm}em`,
      "--aib-case": AI_TAG_BANNER.uppercase ? "uppercase" : "none",
      "--aib-fold": `${size.foldPx}px`,
      "--aib-clip": shape.clipPath(size.notchPx),
      "--aib-sheen": String(sheen),
      "--aib-bg-light": level.light.background,
      "--aib-fg-light": level.light.text,
      "--aib-fold-light": level.light.fold,
      "--aib-bg-dark": level.dark.background,
      "--aib-fg-dark": level.dark.text,
      "--aib-fold-dark": level.dark.fold,
      "--aib-dur": `${animation.durationMs}ms`,
      "--aib-delay": `${animation.delayMs}ms`,
      "--aib-ease": animation.easing,
    } as Record<string, string>,
  };
}
