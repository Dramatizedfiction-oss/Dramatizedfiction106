import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { normalizeEpisodeHtml, parseEpisodeHtml } from "@/lib/episode-content";
import { GENRES } from "@/lib/genres";
import {
  SCENE_BREAK_DESIGNS,
  SCENE_BREAK_VIEWBOX,
  sceneBreakFor,
  sceneBreakNote,
  sceneBreakShapes,
  sceneBreakSvg,
  type SvgNode,
} from "@/lib/scene-breaks";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Sweep F: scene breaks by genre", () => {
  test("every genre in the app has its own design", () => {
    const designs = GENRES.map((genre) => sceneBreakFor(genre).design);
    assert.ok(designs.every((design) => design !== "default"));
    assert.equal(new Set(designs).size, GENRES.length);
    for (const genre of GENRES) assert.equal(sceneBreakFor(genre).source, "genre");
  });

  test("spelling and case don't matter; unknown and missing genres get the default", () => {
    assert.equal(sceneBreakFor("Sci-fi").design, "scifi");
    assert.equal(sceneBreakFor(" SCI FI ").design, "scifi");
    assert.deepEqual(sceneBreakFor("western"), { design: "default", source: "unmapped" });
    assert.deepEqual(sceneBreakFor(""), { design: "default", source: "none" });
    assert.deepEqual(sceneBreakFor(null), { design: "default", source: "none" });
  });

  test("a sub tag with a design wins over the genre, in the writer's tag order", () => {
    assert.deepEqual(sceneBreakFor("romance", ["Slow burn", "Young adult"]), { design: "youngAdult", source: "tag" });
    assert.equal(sceneBreakFor("horror", ["Paranormal", "Dystopian"]).design, "urbanFantasy");
    assert.equal(sceneBreakFor("thriller", ["Dystopian"]).design, "dystopian");
    assert.equal(sceneBreakFor("drama", ["Mythology"]).design, "mythology");
    assert.equal(sceneBreakFor("horror", ["Dark fantasy"]).design, "fantasy");
    assert.equal(sceneBreakFor("mystery", ["Whodunit"]).design, "mystery");
  });

  test("the editor explains the default only when the writer can change it", () => {
    assert.match(sceneBreakNote(sceneBreakFor(""), "") ?? "", /no genre yet/);
    assert.match(sceneBreakNote(sceneBreakFor("western"), "western") ?? "", /western/);
    assert.equal(sceneBreakNote(sceneBreakFor("fantasy"), "fantasy"), null);
  });

  test("every design is a decorative SVG in the same 200x48 box with unique gradient ids", () => {
    for (const design of SCENE_BREAK_DESIGNS) {
      assert.ok(sceneBreakShapes(design).length > 0, design);
      const svg = sceneBreakSvg(design, "u1");
      assert.equal(svg.tag, "svg");
      assert.equal(svg.attrs.viewBox, `0 0 ${SCENE_BREAK_VIEWBOX.width} ${SCENE_BREAK_VIEWBOX.height}`);
      assert.equal(svg.attrs.height, 48);
      assert.equal(svg.attrs["aria-hidden"], "true");

      const all: SvgNode[] = [];
      const walk = (node: SvgNode) => {
        all.push(node);
        node.children?.forEach(walk);
      };
      walk(svg);
      const ids = all.map((node) => node.attrs.id).filter(Boolean);
      assert.ok(ids.every((id) => String(id).startsWith("u1-")), design);
      // Every gradient a shape points at is defined in this SVG.
      for (const node of all) {
        for (const value of Object.values(node.style ?? {})) {
          const ref = String(value).match(/^url\(#(.+)\)$/)?.[1];
          if (ref) assert.ok(ids.includes(ref), `${design}: ${ref}`);
        }
      }
      // Colors come from the theme: currentColor, tokens or gradients only.
      for (const node of all) {
        for (const value of Object.values(node.style ?? {})) {
          assert.doesNotMatch(String(value), /#[0-9a-f]{3,6}\b|rgb\(/i, design);
        }
      }
    }
  });

  test("scene breaks are still stored as a plain <hr>; old breaks keep working", () => {
    assert.equal(normalizeEpisodeHtml("<p>One</p><hr><p>Two</p>"), "<p>One</p><hr><p>Two</p>");
    assert.deepEqual(
      parseEpisodeHtml('<p>One</p><div data-scene-break="true">* * *</div><p>Two</p>').map((block) => block.type),
      ["paragraph", "sceneBreak", "paragraph"],
    );
    const view = read("components/writer-studio/editor/scene-break-view.ts");
    assert.match(view, /nodeViews/);
    assert.doesNotMatch(view, /renderHTML|parseHTML/);
  });

  test("the reader, preview and editor all draw the series' design", () => {
    for (const path of [
      "app/episode/[episodeId]/page.tsx",
      "app/writer-studio/(focus)/episodes/[episodeId]/preview/page.tsx",
      "components/writer-studio/editor/EpisodeEditor.tsx",
    ]) {
      assert.match(read(path), /sceneBreakFor\(episode\.series\.genre, episode\.series\.tags\)/, path);
    }
  });
});

describe("Sweep F: Write and Publish are separate steps", () => {
  const editor = read("components/writer-studio/editor/EpisodeEditor.tsx");

  test("the writing step has no publishing fields", () => {
    assert.doesNotMatch(editor, /EpisodeDetailsForm|AiUsageSelector|ImageUploadField|Sheet/);
    assert.doesNotMatch(read("components/writer-studio/editor/EditorTopBar.tsx"), /onToggleDetails|PanelRightIcon/);
    assert.match(editor, /Next: Publish details/);
  });

  test("the publish step keeps the same publish call and checks", () => {
    const step = read("components/writer-studio/publish/PublishStep.tsx");
    for (const field of ["EpisodeDetailsForm", "AiUsageSelector", "Before you publish", "aiConfirmed"]) {
      assert.match(step, new RegExp(field));
    }
    assert.match(editor, /publishEpisode\(episode\.id, \{\s*title: current\.title\.trim\(\),\s*description: current\.description,\s*contentWarning: current\.contentWarning,\s*aiUsageTag: current\.aiUsageTag,\s*\}\)/);
    assert.match(editor, /flush\(\{ force: true \}\)/);
  });

  test("the old publish address opens step 2", () => {
    assert.match(read("app/writer-studio/(focus)/episodes/[episodeId]/publish/page.tsx"), /\?step=publish/);
  });
});
