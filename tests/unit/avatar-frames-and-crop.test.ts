import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import sharp from "sharp";
import { decideWriterLevelChange } from "@/lib/admin/policy";
import {
  AVATAR_CROP_SIZE,
  AVATAR_MAX_ZOOM,
  CENTERED_CROP,
  clampCrop,
  cropLayout,
  cropRect,
  dragCrop,
  parseCrop,
  zoomCrop,
} from "@/lib/avatar-crop";
import { contrastRatio } from "@/lib/series-color";
import { prepareAvatarOriginal, renderAvatarCrop } from "@/lib/uploads/avatar-image";
import { FRAME_BY_LEVEL, frameFor } from "@/lib/writer-frames";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** The circle (in original pixels) must lie inside the photo: no empty edges. */
function assertCovers(crop: ReturnType<typeof clampCrop>, width: number, height: number) {
  const diameter = Math.min(width, height) / crop.zoom;
  assert.ok(crop.zoom >= 1 && crop.zoom <= AVATAR_MAX_ZOOM, `zoom ${crop.zoom}`);
  assert.ok(crop.x * width - diameter / 2 >= -1e-9 && crop.x * width + diameter / 2 <= width + 1e-9, `x ${crop.x}`);
  assert.ok(crop.y * height - diameter / 2 >= -1e-9 && crop.y * height + diameter / 2 <= height + 1e-9, `y ${crop.y}`);
}

describe("photo positioning", () => {
  const shapes = [
    [1024, 768],
    [600, 1024],
    [800, 800],
    [160, 900],
  ] as const;

  test("any requested position or zoom is clamped so the photo always covers the circle", () => {
    const requests = [
      { x: -5, y: 9, zoom: 0.2 },
      { x: 0.5, y: 0.5, zoom: 99 },
      { x: 1, y: 0, zoom: 1 },
      { x: Number.NaN, y: Infinity, zoom: Number.NaN },
      { x: 0.31, y: 0.77, zoom: 2.5 },
    ];
    for (const [width, height] of shapes) {
      for (const request of requests) assertCovers(clampCrop(request, width, height), width, height);
    }
  });

  test("dragging and zooming stay inside the photo", () => {
    for (const [width, height] of shapes) {
      let crop = clampCrop(CENTERED_CROP, width, height);
      for (const [dx, dy] of [[5000, 0], [-5000, 0], [0, 5000], [0, -5000], [37, -12]]) {
        crop = dragCrop(crop, dx, dy, width, height, 272);
        assertCovers(crop, width, height);
      }
      for (const zoom of [3.7, 0.4, 2, 10]) {
        crop = zoomCrop(crop, zoom, width, height);
        assertCovers(crop, width, height);
      }
      // The editor's drawn image covers the circle too.
      const layout = cropLayout(crop, width, height, 272);
      assert.ok(layout.left <= 0.001 && layout.top <= 0.001, "no gap top/left");
      assert.ok(layout.left + layout.width >= 271.999 && layout.top + layout.height >= 271.999, "no gap bottom/right");
    }
  });

  test("the crop square is whole pixels inside the photo", () => {
    for (const [width, height] of shapes) {
      const rect = cropRect({ x: 0.9, y: 0.1, zoom: 1.7 }, width, height);
      assert.equal(rect.width, rect.height);
      assert.ok(rect.left >= 0 && rect.top >= 0 && rect.left + rect.width <= width && rect.top + rect.height <= height);
    }
  });

  test("only three finite numbers are accepted from requests", () => {
    assert.deepEqual(parseCrop({ x: 0.2, y: 0.3, zoom: 2 }), { x: 0.2, y: 0.3, zoom: 2 });
    for (const bad of [null, {}, { x: "1", y: 0, zoom: 1 }, { x: 0, y: 0, zoom: Infinity }, "0,0,1"]) assert.equal(parseCrop(bad), null);
  });

  test("the server keeps a <=1024px WebP original and cuts a 320px WebP avatar from it", async () => {
    const photo = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: { r: 200, g: 80, b: 40 } } })
      .jpeg()
      .toBuffer();
    const original = await prepareAvatarOriginal(photo);
    assert.equal(Math.max(original.width, original.height), 1024);
    assert.equal((await sharp(original.data).metadata()).format, "webp");

    const avatar = await renderAvatarCrop(original.data, original.width, original.height, { x: 0.9, y: 0.5, zoom: 3 });
    const meta = await sharp(avatar).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, AVATAR_CROP_SIZE);
    assert.equal(meta.height, AVATAR_CROP_SIZE);
    assert.ok(avatar.length < 60_000, `crop is small (${avatar.length} bytes)`);

    const tiny = await sharp({ create: { width: 120, height: 400, channels: 3, background: "#000" } }).png().toBuffer();
    await assert.rejects(prepareAvatarOriginal(tiny), /too small/);
    await assert.rejects(prepareAvatarOriginal(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>")), /JPEG, PNG or WebP/);
  });
});

describe("writer frames", () => {
  test("levels map lowest to highest: Ink, Quill, Gilded, Laureate; readers get none", () => {
    assert.deepEqual(FRAME_BY_LEVEL, { BEGINNER: "ink", FULL: "quill", FEATURED: "gilded", ELITE: "laureate" });
    assert.equal(frameFor({ role: "READER", writerStatus: "ELITE" }), null);
    assert.equal(frameFor({ role: null }), null);
    assert.deepEqual(frameFor({ role: "WRITER", writerStatus: "FEATURED" }), { tier: "gilded", label: "Featured writer" });
    assert.equal(frameFor({ role: "CEO", writerStatus: "ELITE" })?.tier, "laureate");
    assert.equal(frameFor({ role: "WRITER", writerStatus: null })?.tier, "ink");
  });

  test("frame colors keep at least 3:1 contrast on their theme's backgrounds", () => {
    const css = read("app/globals.css").replace(/\r\n/g, "\n");
    const block = (selector: string) => css.slice(css.indexOf(`${selector} {\n  --frame-ink`));
    const token = (source: string, name: string) => new RegExp(`--frame-${name}:\\s*(#[0-9a-f]{6})`).exec(source)![1];
    const light = block(":root");
    const dark = block(".dark");
    for (const name of ["ink", "bronze", "gold"]) {
      for (const background of ["#fbfaf7", "#ffffff", "#f5f5f8"]) assert.ok(contrastRatio(token(light, name), background) >= 3, `${name} light on ${background}`);
      for (const background of ["#131118", "#1c1a24"]) assert.ok(contrastRatio(token(dark, name), background) >= 3, `${name} dark on ${background}`);
    }
    // Laureate's brand gradient stops.
    for (const stop of ["#7c3aed", "#3b82f6"]) {
      for (const background of ["#fbfaf7", "#131118"]) assert.ok(contrastRatio(stop, background) >= 3, `${stop} on ${background}`);
    }
  });

  test("the shimmer respects reduced motion", () => {
    const css = read("app/globals.css");
    assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.frame-shimmer/);
    assert.match(css, /html\[data-reduce-motion="always"\] \.frame-shimmer/);
  });

  test("frames are never stored: no frame column, computed from writerStatus", () => {
    assert.doesNotMatch(read("prisma/schema.prisma"), /frame/i);
  });
});

describe("writer levels (Administration)", () => {
  const board = { id: "b", role: "BOARD" };
  const ceo = { id: "c", role: "CEO" };
  const writer = { id: "w", role: "WRITER", writerStatus: "BEGINNER" };

  test("Board and CEO set writers' levels; not their own, and Board can't change Board/CEO", () => {
    assert.deepEqual(decideWriterLevelChange({ actor: board, target: writer, level: "ELITE" }), { ok: true, level: "ELITE" });
    assert.equal(decideWriterLevelChange({ actor: { id: "r", role: "WRITER" }, target: writer, level: "FULL" }).ok, false);
    assert.equal(decideWriterLevelChange({ actor: board, target: { ...board, writerStatus: "BEGINNER" }, level: "FULL" }).ok, false);
    assert.equal(decideWriterLevelChange({ actor: board, target: { id: "b2", role: "BOARD", writerStatus: "BEGINNER" }, level: "FULL" }).ok, false);
    assert.equal(decideWriterLevelChange({ actor: ceo, target: { id: "b2", role: "BOARD", writerStatus: "BEGINNER" }, level: "FULL" }).ok, true);
    assert.equal(decideWriterLevelChange({ actor: board, target: { id: "r", role: "READER", writerStatus: "BEGINNER" }, level: "FULL" }).ok, false);
    assert.equal(decideWriterLevelChange({ actor: board, target: writer, level: "LEGEND" }).ok, false);
    assert.equal(decideWriterLevelChange({ actor: board, target: writer, level: "BEGINNER" }).ok, false, "no-op refused");
  });
});

describe("avatar routes", () => {
  test("photo routes act only on the signed-in member and never accept an image URL", () => {
    const source = read("app/api/me/avatar/photo/route.ts");
    for (const handler of source.match(/export async function \w+/g) ?? []) {
      const body = source.slice(source.indexOf(handler));
      assert.match(body, /await requireApiUser\(\)[\s\S]*?if \(!guard\.ok\) return guard\.response/, handler);
    }
    assert.doesNotMatch(source, /userId|form\.get\("url"\)|body\.data\.url/);
    assert.match(read("app/api/admin/members/[memberId]/writer-level/route.ts"), /requireApiRole\("BOARD"\)/);
  });

  test("profile photos can't be uploaded through the general upload route, or set through Become a Writer", () => {
    const authorize = read("lib/uploads/authorize.ts");
    assert.match(authorize, /case "profile-image":\s*case "profile-original":[\s\S]*?FORBIDDEN/);
    assert.doesNotMatch(read("app/api/become-author/route.ts"), /profileImage\s*\?:|body\?\.profileImage|decideImageField/);
  });

  test("avatars fall back to the default on a broken image", () => {
    const avatar = read("components/UserAvatar.tsx");
    assert.match(avatar, /onError=\{fallBack\}/);
    assert.match(avatar, /naturalWidth === 0/);
  });
});
