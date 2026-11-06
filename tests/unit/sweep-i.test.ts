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
import { parseEpisodeHtml } from "@/lib/episode-content";
import { checkNote } from "@/lib/highlights";
import { LIBRARY_SHELVES, parseLibraryShelf } from "@/lib/library-shelves";
import { DEFAULT_READING_PREFS, sanitizeReadingPrefs } from "@/lib/reading-prefs";
import { shortEpisodeLabel } from "@/lib/season-rules";
import { readerSeasons, seasonOf } from "@/lib/series-page";
import { anchorFromRange, markerBlocks, parseAnchor, PASSAGE_MAX, resolveAnchor, splitRuns, textBlocks } from "@/lib/text-anchor";

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

describe("Sweep I stage 3: passages, highlights and notes", () => {
  const html = "<h2>One</h2><p>The rain fell. The rain <em>fell</em> again.</p><blockquote><p>Quoted<br>line</p></blockquote><hr><p>Last bit.</p>";
  const blocks = textBlocks(parseEpisodeHtml(html));

  test("text blocks: headings, paragraphs and quoted paragraphs in order, <br> as a line break", () => {
    assert.deepEqual(blocks, ["One", "The rain fell. The rain fell again.", "Quoted\nline", "Last bit."]);
  });

  test("an anchor is the trimmed quote plus context, and finds the right repeat", () => {
    const text = blocks[1];
    const second = text.lastIndexOf("The rain fell");
    const anchor = anchorFromRange(text, second - 1, second + "The rain fell".length + 1)!;
    assert.equal(anchor.quote, "The rain fell");
    assert.deepEqual(resolveAnchor(blocks, anchor), { block: 1, start: second, end: second + 13 });
    const first = anchorFromRange(text, 0, 13)!;
    assert.deepEqual(resolveAnchor(blocks, first), { block: 1, start: 0, end: 13 });
  });

  test("small edits elsewhere don't move a passage; removing it means it changed", () => {
    const anchor = anchorFromRange(blocks[3], 0, 4)!;
    const edited = textBlocks(parseEpisodeHtml("<p>A new opening.</p>" + html));
    assert.deepEqual(resolveAnchor(edited, anchor), { block: 4, start: 0, end: 4 });
    assert.equal(resolveAnchor(textBlocks(parseEpisodeHtml("<p>Nothing like it.</p>")), anchor), null);
  });

  test("anchors from the browser are checked strictly", () => {
    assert.equal(parseAnchor({ quote: "x".repeat(PASSAGE_MAX + 1), prefix: "", suffix: "" }).ok, false);
    assert.equal(parseAnchor({ quote: "   ", prefix: "", suffix: "" }).ok, false);
    assert.equal(parseAnchor({ quote: "ok", prefix: "y".repeat(65), suffix: "" }).ok, false);
    assert.equal(parseAnchor({ quote: "ok\u0000", prefix: "", suffix: "" }).ok, false);
    assert.equal(parseAnchor({ quote: "two\nlines", prefix: "", suffix: "" }).ok, true);
    assert.equal(parseAnchor(null).ok, false);
  });

  test("splitting runs at passage edges keeps every character, with overlapping passages", () => {
    const pieces = splitRuns([5, 4], [
      { start: 2, end: 7 },
      { start: 6, end: 9 },
    ]);
    assert.deepEqual(
      pieces.map((run) => run.map((p) => [p.start, p.end, p.covering.join("")])),
      [
        [[0, 2, ""], [2, 5, "0"]],
        [[0, 1, "0"], [1, 2, "01"], [2, 4, "1"]],
      ],
    );
  });

  test("at most 30 paragraphs show a count, busiest first", () => {
    const counts = new Map(Array.from({ length: 40 }, (_, i) => [i, i % 5] as [number, number]));
    const shown = markerBlocks(counts);
    assert.equal(shown.size, 30);
    assert.ok([...shown].every((block) => (counts.get(block) ?? 0) >= 1));
  });

  test("notes are plain text up to 1,000 characters; blank means none", () => {
    assert.deepEqual(checkNote("  "), { ok: true, note: null });
    assert.deepEqual(checkNote(" hi \r\n there "), { ok: true, note: "hi\n there" });
    assert.equal(checkNote("x".repeat(1001)).ok, false);
    assert.equal(checkNote(5).ok, false);
  });

  test("Library has a Highlights section and markers are a reading preference (on by default)", () => {
    assert.ok(LIBRARY_SHELVES.includes("highlights"));
    assert.equal(parseLibraryShelf("highlights"), "highlights");
    assert.equal(DEFAULT_READING_PREFS.markers, "on");
    assert.equal(sanitizeReadingPrefs({ markers: "off" }).markers, "off");
    assert.equal(sanitizeReadingPrefs({ markers: "maybe" }).markers, "on");
  });

  test("highlight routes are the member's own; passage comments are checked against the text", () => {
    for (const file of ["app/api/me/highlights/route.ts", "app/api/me/highlights/[highlightId]/route.ts"]) assert.match(read(file), /requireApiUser\(\)/);
    const service = read("lib/highlights.ts");
    assert.match(service, /deleteMany\(\{ where: \{ id, userId \} \}\)/);
    assert.match(service, /findFirst\(\{ where: \{ id, userId \}/);
    assert.match(read("lib/comments.ts"), /PASSAGE_CHANGED/);
  });
});
describe("Sweep I stage 4: seasons for readers", () => {
  const seasons = [
    { number: 1, title: "The Signal", description: null, status: "COMPLETE" as const },
    { number: 2, title: null, description: null, status: "ONGOING" as const },
    { number: 3, title: "Drafts only", description: null, status: "ONGOING" as const },
  ];
  const episodes = [
    { season: 1, readTime: 3 },
    { season: 1, readTime: 4 },
    { season: 2, readTime: 5 },
  ];

  test("readers see seasons with a published episode, with their own counts and time", () => {
    const { seasons: visible, withSeasonCodes } = readerSeasons(seasons, episodes, false);
    assert.deepEqual(
      visible.map((season) => [season.number, season.label, season.count, season.minutes, season.status]),
      [
        [1, "Season 1: The Signal", 2, 7, "COMPLETE"],
        [2, "Season 2", 1, 5, "ONGOING"],
      ],
    );
    assert.equal(withSeasonCodes, true);
  });

  test("a complete series shows every season complete; one season reads as before", () => {
    assert.ok(readerSeasons(seasons, episodes, true).seasons.every((season) => season.status === "COMPLETE"));
    const single = readerSeasons([seasons[0]], [{ season: 1, readTime: 2 }], false);
    assert.equal(single.withSeasonCodes, false);
    assert.equal(readerSeasons([], [{ season: 1, readTime: 2 }], false).seasons.length, 1);
  });

  test("an episode's season and number; older rows read as Season 1", () => {
    assert.deepEqual(seasonOf({ episodeNumber: 8, seasonEpisodeNumber: 2, season: { number: 2 } }), { season: 2, numberInSeason: 2 });
    assert.deepEqual(seasonOf({ episodeNumber: 4 }), { season: 1, numberInSeason: 4 });
  });

  test("short labels away from the series: Ep N in Season 1, S2 E3 later", () => {
    assert.equal(shortEpisodeLabel({ episodeNumber: 3, seasonEpisodeNumber: 3, season: { number: 1 } }), "Ep 3");
    assert.equal(shortEpisodeLabel({ episodeNumber: 9, seasonEpisodeNumber: 3, season: { number: 2 } }), "S2 E3");
    assert.equal(shortEpisodeLabel({ episodeNumber: 5 }), "Ep 5");
  });

  test("next episode follows the series-wide order across seasons and brings its season", () => {
    const next = read("lib/nextEpisode.ts");
    assert.match(next, /orderBy: \{ episodeNumber: "asc" \}/);
    assert.match(next, /season: \{ select: \{ number: true, title: true \} \}/);
    assert.match(read("components/EpisodeTransitionCard.tsx"), /begins/);
  });
});