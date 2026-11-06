import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import sharp from "sharp";
import { FRAME_PHOTO_SHARE, FRAME_SAFE_SHARE, clampCrop } from "@/lib/avatar-crop";
import { parseFrameChoice } from "@/lib/store/rules";
import { prepareFrameImage } from "@/lib/uploads/frame-image";
import { looksLikeSvg, sanitizeSvg } from "@/lib/uploads/svg-sanitize";
import { displayedFrame } from "@/lib/writer-frames";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Sweep I stage 1: avatar focus", () => {
  test("the safe zone sits inside the photo, and the photo inside the frame box", () => {
    assert.ok(FRAME_PHOTO_SHARE > 0 && FRAME_PHOTO_SHARE < 1);
    assert.ok(FRAME_SAFE_SHARE > 0 && FRAME_SAFE_SHARE < 1);
  });

  test("a tall, a wide and a tiny-zoom crop all stay inside the photo", () => {
    for (const [w, h] of [
      [400, 1600],
      [1600, 400],
      [1024, 1024],
    ]) {
      const crop = clampCrop({ x: -3, y: 9, zoom: 0.2 }, w, h);
      const half = Math.min(w, h) / crop.zoom / 2;
      assert.ok(crop.zoom >= 1);
      assert.ok(crop.x * w - half >= -1e-9 && crop.x * w + half <= w + 1e-9);
      assert.ok(crop.y * h - half >= -1e-9 && crop.y * h + half <= h + 1e-9);
    }
  });

  test("re-focusing a library avatar is Board/CEO only and moves its users in one transaction", () => {
    const route = read("app/api/admin/avatars/[avatarId]/focus/route.ts");
    assert.match(route, /requireApiRole\("BOARD"\)/);
    const service = read("lib/admin/avatars-service.ts");
    const focus = service.slice(service.indexOf("export async function focusPlatformAvatar"));
    assert.match(focus, /\$transaction/);
    assert.match(focus, /storeItem\.updateMany/);
    assert.match(focus, /user\.updateMany\(\{ where: \{ image: avatar\.url, avatarOriginalUrl: null \}/);
    assert.match(focus, /AUDIT\.AVATAR_FOCUSED/);
  });

  test("the focus editor shows the safe-zone ring and previews at 32, 48 and profile size", () => {
    const cropper = read("components/avatar/AvatarCropper.tsx");
    assert.match(cropper, /Keep the face inside the inner ring\./);
    for (const size of [112, 48, 32]) assert.match(cropper, new RegExp(`size: ${size}`));
  });

  test("Store and library pictures go through the shared avatar component", () => {
    for (const file of ["components/store/StoreGrid.tsx", "components/admin/StoreManager.tsx", "components/avatar/AvatarPlace.tsx"]) {
      assert.doesNotMatch(read(file), /<img\b/, file);
    }
  });
});

describe("Sweep I stage 2: Store frames", () => {
  const ring = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="#c9a227" stroke-width="6"/></svg>';

  test("SVG cleaning keeps drawing and drops scripts, handlers, styles, foreign content and outside references", () => {
    const dirty =
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" onload="alert(1)">' +
      "<script>alert(1)</script><style>circle{fill:url(https://evil.example/x)}</style>" +
      '<foreignObject><div>hi</div></foreignObject><image href="https://evil.example/a.png"/>' +
      '<defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs>' +
      '<circle cx="50" cy="50" r="40" fill="url(#g)" style="fill:red"/>' +
      '<rect width="10" height="10" fill="url(https://evil.example/p)"/>' +
      '<use href="https://evil.example/s.svg#x"/><use href="#g"/><a href="javascript:alert(1)"><path d="M0 0"/></a></svg>';
    const clean = sanitizeSvg(dirty)!;
    assert.ok(clean.startsWith("<svg"));
    for (const bad of ["script", "onload", "style", "foreignObject", "<image", "evil.example", "javascript", "<a"]) {
      assert.ok(!clean.includes(bad), `still contains ${bad}: ${clean}`);
    }
    assert.match(clean, /<linearGradient id="g">/);
    assert.match(clean, /fill="url\(#g\)"/);
    assert.match(clean, /<use href="#g"\/>/);
    assert.match(clean, /viewBox="0 0 100 100"/);
  });

  test("non-SVG input and oversized SVG are refused", () => {
    assert.equal(sanitizeSvg("<html><body>x</body></html>"), null);
    assert.equal(sanitizeSvg(`<svg>${"<g/>".repeat(60_000)}</svg>`), null);
    assert.ok(looksLikeSvg(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(`  ${ring}`)])));
    assert.ok(!looksLikeSvg(Buffer.from([0x89, 0x50, 0x4e, 0x47])));
  });

  test("an SVG frame becomes a 512px transparent WebP", async () => {
    const out = await prepareFrameImage(Buffer.from(ring));
    const meta = await sharp(out).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, 512);
    assert.equal(meta.height, 512);
    assert.equal(meta.hasAlpha, true);
  });

  test("raster frames must be square with transparency", async () => {
    const blank = (width: number, height: number, channels: 3 | 4) =>
      sharp({ create: { width, height, channels, background: { r: 9, g: 9, b: 9, alpha: 0 } } });
    assert.equal((await sharp(await prepareFrameImage(await blank(300, 300, 4).png().toBuffer())).metadata()).width, 512);
    await assert.rejects(prepareFrameImage(await blank(400, 300, 4).png().toBuffer()), /square/);
    await assert.rejects(prepareFrameImage(await blank(300, 300, 3).png().toBuffer()), /transparent/);
    await assert.rejects(prepareFrameImage(await blank(300, 300, 3).jpeg().toBuffer()), /transparent/);
    await assert.rejects(prepareFrameImage(await blank(100, 100, 4).png().toBuffer()), /too small/);
  });

  test("frame choices parse strictly", () => {
    assert.deepEqual(parseFrameChoice({ choice: "level" }), { kind: "level" });
    assert.deepEqual(parseFrameChoice({ choice: "none" }), { kind: "none" });
    assert.deepEqual(parseFrameChoice({ choice: "store", itemId: "abc" }), { kind: "store", itemId: "abc" });
    for (const bad of [null, [], {}, { choice: "store" }, { choice: "store", itemId: "" }, { choice: "gold" }]) assert.equal(parseFrameChoice(bad), null);
  });

  test("what shows: an active Store frame, else the level frame unless hidden; readers nothing by default", () => {
    const store = { imageUrl: "u", name: "Ivy", active: true, category: "FRAME" };
    const writer = { role: "WRITER", writerStatus: "FULL" };
    assert.equal(displayedFrame(writer)?.kind, "level");
    assert.equal(displayedFrame({ ...writer, selectedFrame: store })?.kind, "store");
    assert.equal(displayedFrame({ ...writer, selectedFrame: { ...store, active: false } })?.kind, "level");
    assert.equal(displayedFrame({ ...writer, hideLevelFrame: true }), null);
    assert.equal(displayedFrame({ role: "READER" }), null);
    assert.equal(displayedFrame({ role: "READER", selectedFrame: store })?.kind, "store");
    assert.equal(displayedFrame({ role: "READER", selectedFrame: { ...store, category: "AVATAR" } }), null);
  });

  test("frame routes: upload is Board/CEO only, choosing is the member's own account", () => {
    assert.match(read("app/api/admin/store/frames/route.ts"), /requireApiRole\("BOARD"\)/);
    const me = read("app/api/me/frame/route.ts");
    assert.match(me, /requireApiUser\(\)/);
    assert.match(me, /setMemberFrame\(guard\.user\.id/);
    assert.match(read("lib/store/service.ts"), /category: "FRAME", active: true/);
  });
});
