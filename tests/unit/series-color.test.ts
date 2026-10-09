import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { contrastRatio, readableTextOn, seriesAccentHex } from "@/lib/series-color";

describe("series color", () => {
  test("only plain hex colors are used, normalized to 6 lowercase digits", () => {
    assert.equal(seriesAccentHex("#ABC"), "#aabbcc");
    assert.equal(seriesAccentHex(" #7C3AED "), "#7c3aed");
    assert.equal(seriesAccentHex("Black"), null);
    assert.equal(seriesAccentHex("red;background:url(x)"), null);
    assert.equal(seriesAccentHex(null), null);
    assert.equal(seriesAccentHex(""), null);
  });

  test("text flips to whichever of white or near-black reads better", () => {
    assert.equal(readableTextOn("#7c3aed"), "#ffffff");
    assert.equal(readableTextOn("#000000"), "#ffffff");
    assert.equal(readableTextOn("#facc15"), "#111118");
    assert.equal(readableTextOn("#ffffff"), "#111118");
  });

  test("the chosen text color always clears WCAG AA large-text contrast (3:1)", () => {
    for (let r = 0; r <= 255; r += 51) {
      for (let g = 0; g <= 255; g += 51) {
        for (let b = 0; b <= 255; b += 51) {
          const bg = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
          assert.ok(contrastRatio(bg, readableTextOn(bg)) >= 3, bg);
        }
      }
    }
  });
});
