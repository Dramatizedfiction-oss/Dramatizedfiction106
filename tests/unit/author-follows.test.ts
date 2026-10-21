import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { checkCanFollow, DEVICE_IMPORT_MAX, followerCountText, parseDeviceFollowIds } from "@/lib/author-follow-rules";
import { parseLibraryShelf } from "@/lib/library-shelves";
import { FOLLOW_RATE_LIMITS, overRateLimit } from "@/lib/rate-limit-rules";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("following writers (Sweep B2)", () => {
  test("only writers can be followed, never yourself", () => {
    assert.deepEqual(checkCanFollow("me", { id: "w", role: "WRITER" }), { ok: true });
    assert.deepEqual(checkCanFollow("me", { id: "b", role: "BOARD" }), { ok: true });
    assert.deepEqual(checkCanFollow("me", { id: "c", role: "CEO" }), { ok: true });
    assert.equal((checkCanFollow("w", { id: "w", role: "WRITER" }) as { code: string }).code, "SELF");
    assert.equal((checkCanFollow("me", { id: "r", role: "READER" }) as { code: string }).code, "NOT_FOUND");
    assert.equal((checkCanFollow("me", null) as { status: number }).status, 404);
  });

  test("device imports keep strings only, no repeats, capped", () => {
    assert.deepEqual(parseDeviceFollowIds(["a", "a", 1, null, "", "b"]), ["a", "b"]);
    assert.deepEqual(parseDeviceFollowIds("a"), []);
    assert.deepEqual(parseDeviceFollowIds({ a: 1 }), []);
    const many = Array.from({ length: 80 }, (_, index) => `id-${index}`);
    assert.equal(parseDeviceFollowIds(many).length, DEVICE_IMPORT_MAX);
    assert.deepEqual(parseDeviceFollowIds(["x".repeat(200)]), []);
  });

  test("follower count wording", () => {
    assert.equal(followerCountText(1), "1 follower");
    assert.equal(followerCountText(1200), "1,200 followers");
  });

  test("rate limit windows", () => {
    assert.equal(overRateLimit([29, 0], FOLLOW_RATE_LIMITS), false);
    assert.equal(overRateLimit([30, 30], FOLLOW_RATE_LIMITS), true);
    assert.equal(overRateLimit([0, 300], FOLLOW_RATE_LIMITS), true);
    assert.equal(overRateLimit([], FOLLOW_RATE_LIMITS), false);
  });

  test("library shelves parse from the URL", () => {
    assert.equal(parseLibraryShelf("people"), "people");
    assert.equal(parseLibraryShelf("bookmarks"), "bookmarks");
    assert.equal(parseLibraryShelf("nope"), "following");
    assert.equal(parseLibraryShelf(undefined), "following");
    // Sweep D names work too.
    assert.equal(parseLibraryShelf("followed-series"), "following");
    assert.equal(parseLibraryShelf("follows"), "people");
  });

  test("the Library is one page of three named sections, no tabs (Sweep D)", () => {
    const shelves = read("components/reader/LibraryShelves.tsx");
    assert.doesNotMatch(shelves, /role="tablist"|role="tab"/);
    const titles = read("lib/library-shelves.ts");
    assert.match(titles, /following: "Followed Series"/);
    assert.match(titles, /people: "Follows"/);
  });
});

describe("follow structure", () => {
  test("follow routes use requireApiUser and the shared rate limit; no redirects", () => {
    for (const path of [
      "app/api/me/author-follows/[authorId]/route.ts",
      "app/api/me/author-follows/import/route.ts",
      "app/api/me/follows/[seriesId]/route.ts",
    ]) {
      const source = read(path);
      assert.match(source, /await requireApiUser\(\)/, path);
      assert.match(source, /takeRateLimit\(guard\.user\.id, "follow", FOLLOW_RATE_LIMITS\)/, path);
      assert.doesNotMatch(source, /redirect\(/, path);
    }
    assert.match(read("app/api/me/author-follows/route.ts"), /listFollowedAuthors\(guard\.user\.id\)/);
  });

  test("follows are on the account, not the device", () => {
    const button = read("components/follow/FollowAuthorButton.tsx");
    assert.doesNotMatch(button, /localStorage/);
    assert.match(button, /\/api\/me\/author-follows\//);
  });

  test("visitors never get Bookmarks or People; follower lists only show opted-in members", () => {
    const view = read("components/profile/ReadingView.tsx");
    const visitorPart = view.slice(view.indexOf("const libraryPublic"));
    assert.doesNotMatch(visitorPart, /listFollowedAuthors|ReaderPeople|LibraryShelves/);
    const service = read("lib/author-follows.ts");
    assert.match(service, /followerListVisibility: "PUBLIC"/);
    assert.doesNotMatch(service, /email:\s*true/);
  });

  test("the owner never gets a Follow button on their own profile", () => {
    const page = read("app/author/[authorId]/page.tsx");
    assert.match(page, /isOwner \? \(/);
    assert.match(page, /<FollowAuthorButton/);
  });
});
