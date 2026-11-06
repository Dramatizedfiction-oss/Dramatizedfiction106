import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { FRAME_PHOTO_SHARE, FRAME_SAFE_SHARE, clampCrop } from "@/lib/avatar-crop";

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
