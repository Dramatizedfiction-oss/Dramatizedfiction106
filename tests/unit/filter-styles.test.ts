import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { GENRE_STYLES, SORT_STYLES, SURFACE, type FilterStyle } from "@/lib/filter-styles.config";
import { genreStyle, sortStyle } from "@/lib/filter-styles";
import { GENRES } from "@/lib/genres";
import { contrastRatio } from "@/lib/series-color";

function checkContrast(name: string, style: FilterStyle) {
  for (const theme of ["light", "dark"] as const) {
    const colors = style[theme];
    const background = colors.background ?? SURFACE[theme];
    const stops = Array.isArray(colors.text) ? colors.text : [colors.text];
    for (const stop of stops) {
      const ratio = contrastRatio(stop, background);
      assert.ok(ratio >= 4.5, `${name} ${theme}: ${stop} on ${background} is ${ratio.toFixed(2)}:1`);
    }
  }
}

describe("explore filter styles", () => {
  test("every real genre and sort has its own style (no fallback)", () => {
    for (const genre of ["all", ...GENRES]) assert.ok(GENRE_STYLES[genre], genre);
    for (const sort of ["trending", "newest"]) assert.ok(SORT_STYLES[sort], sort);
  });

  test("every label (each gradient stop too) reaches 4.5:1 in both themes", () => {
    for (const [name, style] of Object.entries({ ...GENRE_STYLES, ...SORT_STYLES })) {
      checkContrast(name, style);
    }
  });

  test("unknown values fall back to a plain, title-cased label", () => {
    assert.equal(genreStyle("space-opera").label, "Space-Opera");
    assert.equal(sortStyle("oldest").label, "Oldest");
  });
});
