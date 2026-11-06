import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { MAX_USES, sanitizeSvg } from "@/lib/uploads/svg-sanitize";
import { safeHref } from "@/lib/content/markdown";
import { EDIT_RATE_LIMITS, STUDIO_CREATE_RATE_LIMITS, UPLOAD_RATE_LIMITS } from "@/lib/rate-limit-rules";

/*
 * Sweep 1 (security and access): image fields take only their own purpose's
 * uploads, files are deleted only when unused, SVG frames can't multiply
 * <use> copies, Board links can't hide "//host" behind a backslash, and the
 * security headers are set.
 */

const read = (path: string) => readFileSync(path, "utf8");

test("image fields accept only their own upload purpose, from our own store", async () => {
  process.env.BLOB_STORE_ID = "store_abc123";
  const { decideImageField, isOwnedImageUrl } = await import("@/lib/uploads/image-storage");
  const host = "https://abc123.public.blob.vercel-storage.com";
  const banner = `${host}/images/profile-banner/a.webp`;
  const avatar = `${host}/images/platform-avatar/b.webp`;
  const cover = `${host}/images/series-cover/c.webp`;

  assert.deepEqual(decideImageField(banner, null, "profile-banner"), { ok: true, value: banner });
  assert.equal(decideImageField(avatar, null, "profile-banner").ok, false, "a Store avatar can't become a banner");
  assert.equal(decideImageField(cover, null, "profile-banner").ok, false, "someone's cover can't become a banner");
  assert.equal(decideImageField(banner, null, "series-cover").ok, false);
  assert.deepEqual(decideImageField(cover, null, "series-cover"), { ok: true, value: cover });
  // The value already stored may always be kept (legacy URLs keep working).
  assert.deepEqual(decideImageField(avatar, avatar, "profile-banner"), { ok: true, value: avatar });
  // Another Blob store is never "ours".
  assert.equal(isOwnedImageUrl("https://other999.public.blob.vercel-storage.com/images/profile-banner/a.webp"), false);
});

test("image deletes check that nothing still uses the file; every field passes its purpose", () => {
  const storage = read("lib/uploads/image-storage.ts");
  assert.match(storage, /export async function isImageStillUsed/);
  assert.match(storage, /if \(await isImageStillUsed\(previous\)\) return;/);
  for (const [file, purpose] of [
    ["app/api/writer-studio/series/route.ts", "series-cover"],
    ["app/api/writer-studio/series/[seriesId]/route.ts", "series-cover"],
    ["app/api/writer-studio/episodes/route.ts", "episode-cover"],
    ["app/api/writer-studio/episodes/[episodeId]/route.ts", "episode-cover"],
    ["app/api/writer-studio/episodes/[episodeId]/publish/route.ts", "episode-cover"],
    ["app/api/me/profile-images/route.ts", "profile-banner"],
  ]) {
    assert.match(read(file), new RegExp(`decideImageField\\([^)]*"${purpose}"\\)`), file);
  }
});

test("SVG frames: a <use> can't point at something that holds a <use>", () => {
  let bomb = `<svg xmlns="http://www.w3.org/2000/svg"><defs><g id="l0"><circle r="1"/></g>`;
  for (let i = 1; i <= 6; i++) bomb += `<g id="l${i}">${Array.from({ length: 10 }, () => `<use href="#l${i - 1}"/>`).join("")}</g>`;
  bomb += `</defs><use href="#l6"/></svg>`;
  const clean = sanitizeSvg(bomb);
  assert.ok(clean);
  // Only the copies of the plain circle survive; nothing references a group of copies.
  assert.doesNotMatch(clean!, /href="#l[1-6]"/);
  assert.match(clean!, /href="#l0"/);
  // Pointing at a <use> directly, or with no target, is dropped too.
  assert.doesNotMatch(sanitizeSvg(`<svg><circle id="c" r="1"/><use id="u" href="#c"/><use href="#u"/><use/></svg>`)!, /href="#u"|<use\/>/);
  // Too many copies: refused outright.
  assert.equal(sanitizeSvg(`<svg><circle id="c" r="1"/>${'<use href="#c"/>'.repeat(MAX_USES + 1)}</svg>`), null);
  // An ordinary frame with a few copies still works.
  assert.match(sanitizeSvg(`<svg><defs><circle id="dot" r="2"/></defs><use href="#dot" x="5"/><use href="#dot" x="9"/></svg>`)!, /<use href="#dot" x="9"\/>/);
});

test("SVG rendering has a time limit; stored-image reads don't follow redirects", () => {
  assert.match(read("lib/uploads/frame-image.ts"), /\.timeout\(\{ seconds: SVG_RENDER_SECONDS \}\)/);
  const reader = read("lib/uploads/avatar-image.ts");
  assert.match(reader, /redirect: "error"/);
  assert.match(reader, /AbortSignal\.timeout\(/);
});

test("Board links: a backslash path is not a site path", () => {
  assert.equal(safeHref("/\\evil.example"), null);
  assert.equal(safeHref("/a\\b"), null);
  assert.equal(safeHref("/explore?x=1"), "/explore?x=1");
});

test("uploads, edits and Studio creation are rate-limited", () => {
  assert.ok(UPLOAD_RATE_LIMITS.length && EDIT_RATE_LIMITS.length && STUDIO_CREATE_RATE_LIMITS.length);
  for (const file of [
    "app/api/uploads/image/route.ts",
    "app/api/me/avatar/photo/route.ts",
    "app/api/me/author-profile/book-cover/route.ts",
    "app/api/admin/store/frames/route.ts",
  ]) {
    assert.match(read(file), /takeRateLimit\([^)]*"upload", UPLOAD_RATE_LIMITS\)/, file);
  }
  assert.match(read("lib/comments.ts"), /"comment-edit", EDIT_RATE_LIMITS/);
  assert.match(read("lib/highlights.ts"), /"highlight-edit", EDIT_RATE_LIMITS/);
  for (const file of ["app/api/writer-studio/series/route.ts", "app/api/writer-studio/episodes/route.ts", "app/api/writer-studio/series/[seriesId]/seasons/route.ts"]) {
    assert.match(read(file), /"studio-create", STUDIO_CREATE_RATE_LIMITS/, file);
  }
});

test("Writer Studio text has server-side limits", async () => {
  const { STUDIO_TEXT_LIMITS, boundedText } = await import("@/lib/api/writer-studio-request");
  assert.equal(boundedText(STUDIO_TEXT_LIMITS.seriesTitle).safeParse("x".repeat(151)).success, false);
  assert.equal(boundedText(STUDIO_TEXT_LIMITS.seriesTitle).safeParse("x".repeat(150)).success, true);
  for (const file of [
    "app/api/writer-studio/series/route.ts",
    "app/api/writer-studio/series/[seriesId]/route.ts",
    "app/api/writer-studio/episodes/route.ts",
    "app/api/writer-studio/episodes/[episodeId]/route.ts",
    "app/api/writer-studio/episodes/[episodeId]/publish/route.ts",
  ]) {
    assert.doesNotMatch(read(file), /: optionalText,/, file);
  }
});

test("security headers are set for every path, CSP report-only", async () => {
  const config = createRequire(import.meta.url)("../../next.config.js") as {
    poweredByHeader: boolean;
    headers: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]>;
  };
  assert.equal(config.poweredByHeader, false);
  const [rule] = await config.headers();
  assert.equal(rule.source, "/:path*");
  const keys = rule.headers.map((header) => header.key);
  for (const key of ["Content-Security-Policy-Report-Only", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]) {
    assert.ok(keys.includes(key), key);
  }
  assert.ok(!keys.includes("Content-Security-Policy"), "the enforcing CSP comes later");
  const csp = rule.headers.find((header) => header.key === "Content-Security-Policy-Report-Only")!.value;
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
});
