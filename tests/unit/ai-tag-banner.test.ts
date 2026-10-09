import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { AI_TAG_BANNER } from "@/lib/ai-tag-banner.config";
import { aiTagBannerModel, displayedAiTag } from "@/lib/ai-tag-banner";
import { AI_USAGE_OPTIONS } from "@/lib/ai-usage";
import { contrastRatio } from "@/lib/series-color";

const hex6 = (value: string) =>
  value.length === 4 ? `#${[...value.slice(1)].map((d) => d + d).join("")}` : value;

describe("AI tag banner (display only)", () => {
  test("shows stored and UI forms of every real level", () => {
    for (const option of AI_USAGE_OPTIONS) {
      assert.equal(displayedAiTag(option), option);
      assert.equal(displayedAiTag(option.replaceAll(" ", "_")), option);
    }
  });

  test("shows nothing for a missing or unknown tag instead of claiming AI FREE", () => {
    for (const value of [null, undefined, "", "  ", "AI_MAYBE", "free"]) {
      assert.equal(displayedAiTag(value), null);
      assert.equal(aiTagBannerModel(value), null);
    }
  });

  test("the config covers exactly the real levels", () => {
    assert.deepEqual(Object.keys(AI_TAG_BANNER.levels).sort(), [...AI_USAGE_OPTIONS].sort());
  });

  test("label text meets WCAG AA (4.5:1) on its banner in both themes", () => {
    for (const [tag, level] of Object.entries(AI_TAG_BANNER.levels)) {
      for (const theme of ["light", "dark"] as const) {
        const { background, text } = level[theme];
        const ratio = contrastRatio(hex6(background), hex6(text));
        assert.ok(ratio >= 4.5, `${tag} ${theme}: ${ratio.toFixed(2)}:1`);
      }
    }
  });

  test("the configured shape exists and the accessible name includes the label", () => {
    assert.ok(AI_TAG_BANNER.shape in AI_TAG_BANNER.shapes);
    const model = aiTagBannerModel("AI_HEAVY");
    assert.ok(model);
    assert.match(model.accessibleName, /^AI usage: AI Heavy\./);
  });
});
