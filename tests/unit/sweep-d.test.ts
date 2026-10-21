import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { DEFAULT_MIN_ITEMS } from "@/lib/feed/config";
import { BACK_OF_STORE_PATH, STORE_CATEGORIES } from "@/lib/store/rules";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Sweep D: Back of the store", () => {
  test("every Store category has its own Back of the store page, behind the Administration guard", () => {
    assert.equal(BACK_OF_STORE_PATH, "/administration/back-of-store");
    assert.match(read("app/administration/back-of-store/page.tsx"), /requireAdministrationPage\(await auth\(\), BACK_OF_STORE_PATH\)/);
    for (const category of STORE_CATEGORIES) {
      const page = read(`app/administration/back-of-store/${category.adminSlug}/page.tsx`);
      assert.match(page, /requireAdministrationPage\(await auth\(\)/);
    }
  });

  test("old links redirect, and the public Store has no creation tools", () => {
    const config = read("next.config.js");
    assert.match(config, /source: "\/administration\/store", destination: "\/administration\/back-of-store\/avatars"/);
    assert.match(config, /source: "\/administration\/avatars", destination: "\/administration\/back-of-store\/avatars"/);
    assert.match(read("components/admin/AdminNav.tsx"), /\/administration\/back-of-store", label: "Back of the store"/);
    for (const path of ["app/store/page.tsx", "components/store/StoreGrid.tsx"]) {
      assert.doesNotMatch(read(path), /StoreManager|\/api\/admin\//, path);
    }
  });
});

describe("Sweep D: Explore rows", () => {
  test("shelves may repeat the top row; the client shows them as composed", () => {
    const server = read("lib/feed/server.ts");
    assert.match(server, /const all = composeFeed\(base\);/);
    assert.doesNotMatch(read("components/feed/FeedShelves.tsx"), /hiddenIds/);
  });

  test("new shelves default to a minimum of 3", () => {
    assert.equal(DEFAULT_MIN_ITEMS, 3);
  });
});
