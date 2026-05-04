export const AI_USAGE_OPTIONS = [
  "AI FREE",
  "AI CORRECTED",
  "AI HEAVY",
  "AI WRITTEN",
] as const;

export type AiUsageTag = (typeof AI_USAGE_OPTIONS)[number];
export type AiUsageTagValue =
  | "AI_FREE"
  | "AI_CORRECTED"
  | "AI_HEAVY"
  | "AI_WRITTEN";

export function normalizeAiUsageTag(value?: string | null): AiUsageTag {
  if (value && AI_USAGE_OPTIONS.includes(value as AiUsageTag)) {
    return value as AiUsageTag;
  }

  return "AI FREE";
}

export function serializeAiUsageTag(tag?: string | null): AiUsageTagValue {
  return normalizeAiUsageTag(tag).replaceAll(" ", "_") as AiUsageTagValue;
}

export function deserializeAiUsageTag(tag?: string | null): AiUsageTag {
  return normalizeAiUsageTag(tag?.replaceAll("_", " "));
}

export function aiUsageDescription(tag: AiUsageTag) {
  switch (tag) {
    case "AI FREE":
      return "Written without AI-generated language.";
    case "AI CORRECTED":
      return "Human-written with AI used for cleanup or proofreading.";
    case "AI HEAVY":
      return "AI-assisted drafting played a substantial role.";
    case "AI WRITTEN":
      return "The final language was primarily AI-generated.";
    default:
      return "Author transparency tag.";
  }
}
