import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { BUILT_IN_AVATARS, DEFAULT_AVATARS, avatarSrc, defaultAvatarFor, hasCustomAvatar } from "@/lib/avatars";
import { normalizeProfileLink, safeProfileLink } from "@/lib/profile";

const custom = "https://store.public.blob.vercel-storage.com/images/profile-image/a.webp";

describe("avatars", () => {
  test("a custom picture always wins, for every role", () => {
    for (const role of ["READER", "WRITER", "BOARD", "CEO", null]) {
      assert.equal(avatarSrc({ image: custom, role }), custom);
    }
  });

  test("no custom picture: reader default for readers, writer default for writers and above", () => {
    assert.equal(avatarSrc({ image: null, role: "READER" }), DEFAULT_AVATARS.reader);
    for (const role of ["WRITER", "BOARD", "CEO", "AUTHOR", "ADMIN"]) assert.equal(defaultAvatarFor(role), DEFAULT_AVATARS.writer);
    assert.equal(avatarSrc({}), DEFAULT_AVATARS.reader);
  });

  test("becoming a writer changes only the fallback, never a custom picture", () => {
    assert.equal(avatarSrc({ image: custom, role: "READER" }), avatarSrc({ image: custom, role: "WRITER" }));
    assert.notEqual(avatarSrc({ role: "READER" }), avatarSrc({ role: "WRITER" }));
  });

  test("blank image strings count as no custom picture", () => {
    assert.equal(hasCustomAvatar({ image: "   " }), false);
  });

  test("defaults go through the Administration-controlled route; built-in files exist", () => {
    assert.equal(DEFAULT_AVATARS.reader, "/api/avatars/default/reader");
    assert.equal(DEFAULT_AVATARS.writer, "/api/avatars/default/writer");
    for (const file of Object.values(BUILT_IN_AVATARS)) assert.ok(existsSync(join(process.cwd(), "public", file)), file);
  });
});

describe("profile links", () => {
  test("only http(s) web addresses are accepted or rendered", () => {
    assert.deepEqual(normalizeProfileLink("example.com/me"), { ok: true, value: "https://example.com/me" });
    for (const bad of ["javascript:alert(1)", "mailto:a@b.co", "data:text/html,x", "https://localhost"]) {
      assert.equal(normalizeProfileLink(bad).ok, false, bad);
    }
    assert.equal(safeProfileLink("javascript:alert(1)"), null);
  });
});
