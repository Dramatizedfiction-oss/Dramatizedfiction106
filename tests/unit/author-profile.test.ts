import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ALL_SECTIONS_ON,
  AUTHOR_PROFILE_LIMITS,
  STARTER_PROMPTS,
  checkBio,
  linkDomain,
  linkIcon,
  normalizeAuthorProfile,
  sectionVisible,
  type AuthorProfileInput,
} from "@/lib/author-profile-rules";
import { clampCrop, cropLayout, cropRect } from "@/lib/avatar-crop";

const empty = (): AuthorProfileInput => ({ bio: "", sections: { ...ALL_SECTIONS_ON }, library: [], about: [], links: [] });
const book = (title = "Ember") => ({ kind: "BOOK" as const, title, note: "", url: "", coverImage: "" });

describe("bio", () => {
  test("plain text up to 300 characters, cleaned", () => {
    assert.deepEqual(checkBio("  Hello\n\n\n\nworld  "), { ok: true, value: "Hello\n\nworld" });
    assert.equal(checkBio("a".repeat(300)).ok, true);
    assert.equal(checkBio("a".repeat(301)).ok, false);
    assert.deepEqual(checkBio("   "), { ok: true, value: null });
  });

  test("no links in the bio", () => {
    assert.equal(checkBio("Read me at https://example.com").ok, false);
    assert.equal(checkBio("see www.example.com").ok, false);
    assert.equal(checkBio("I write about the web.").ok, true);
  });
});

describe("links", () => {
  test("icons come from the domain, generic otherwise", () => {
    assert.equal(linkIcon("https://www.amazon.co.uk/dp/1"), "amazon");
    assert.equal(linkIcon("https://amzn.to/x"), "amazon");
    assert.equal(linkIcon("https://m.youtube.com/@me"), "youtube");
    assert.equal(linkIcon("https://twitter.com/me"), "x");
    assert.equal(linkIcon("https://x.com/me"), "x");
    assert.equal(linkIcon("https://myname.substack.com"), "substack");
    assert.equal(linkIcon("https://notamazon.com"), "link");
    assert.equal(linkIcon("https://example.com"), "link");
    assert.equal(linkIcon("javascript:alert(1)"), "link");
  });

  test("the domain shown to readers", () => {
    assert.equal(linkDomain("https://www.Patreon.com/me"), "patreon.com");
    assert.equal(linkDomain("data:text/html,hi"), null);
  });

  test("only http(s) addresses are accepted", () => {
    for (const url of ["javascript:alert(1)", "data:text/html,<b>x</b>", "mailto:a@b.co", "ftp://example.com", "vbscript:x"]) {
      const result = normalizeAuthorProfile({ ...empty(), links: [{ label: "Bad", url, subtext: "" }] });
      assert.equal(result.ok, false, url);
    }
    const ok = normalizeAuthorProfile({ ...empty(), links: [{ label: "Shop", url: "amazon.com/dp/1", subtext: "  Get it  " }] });
    assert.ok(ok.ok);
    assert.equal(ok.value.links[0].url, "https://amazon.com/dp/1");
    assert.equal(ok.value.links[0].subtext, "Get it");
  });

  test("a link needs a name and an address; subtext is limited", () => {
    assert.equal(normalizeAuthorProfile({ ...empty(), links: [{ label: "", url: "https://a.co", subtext: "" }] }).ok, false);
    assert.equal(normalizeAuthorProfile({ ...empty(), links: [{ label: "A", url: "", subtext: "" }] }).ok, false);
    const long = "x".repeat(AUTHOR_PROFILE_LIMITS.linkSubtext + 1);
    assert.equal(normalizeAuthorProfile({ ...empty(), links: [{ label: "A", url: "https://a.co", subtext: long }] }).ok, false);
  });
});

describe("limits", () => {
  test("12 Library cards, 10 About cards, 10 links", () => {
    assert.equal(normalizeAuthorProfile({ ...empty(), library: Array.from({ length: 12 }, () => book()) }).ok, true);
    assert.equal(normalizeAuthorProfile({ ...empty(), library: Array.from({ length: 13 }, () => book()) }).ok, false);
    const card = { prompt: "Q", answer: "A" };
    assert.equal(normalizeAuthorProfile({ ...empty(), about: Array.from({ length: 11 }, () => card) }).ok, false);
    const link = { label: "L", url: "https://a.co", subtext: "" };
    assert.equal(normalizeAuthorProfile({ ...empty(), links: Array.from({ length: 11 }, () => link) }).ok, false);
  });

  test("book title required; note up to 120; series only once", () => {
    assert.equal(normalizeAuthorProfile({ ...empty(), library: [book("  ")] }).ok, false);
    assert.equal(normalizeAuthorProfile({ ...empty(), library: [{ ...book(), note: "n".repeat(121) }] }).ok, false);
    const twice = normalizeAuthorProfile({
      ...empty(),
      library: [
        { kind: "SERIES", seriesId: "s1" },
        { kind: "SERIES", seriesId: "s1" },
      ],
    });
    assert.equal(twice.ok, false);
  });

  test("About answers: required, up to 300", () => {
    assert.equal(normalizeAuthorProfile({ ...empty(), about: [{ prompt: "Q", answer: " " }] }).ok, false);
    assert.equal(normalizeAuthorProfile({ ...empty(), about: [{ prompt: "Q", answer: "a".repeat(301) }] }).ok, false);
    assert.equal(normalizeAuthorProfile({ ...empty(), about: [{ prompt: "Q", answer: "a".repeat(300) }] }).ok, true);
  });

  test("eight starter prompts", () => {
    assert.equal(STARTER_PROMPTS.length, 8);
    assert.ok(STARTER_PROMPTS.every((prompt) => prompt.length <= AUTHOR_PROFILE_LIMITS.prompt));
  });
});

describe("empty stays empty", () => {
  test("a section shows to visitors only when on and not empty", () => {
    assert.equal(sectionVisible(true, 0), false);
    assert.equal(sectionVisible(false, 3), false);
    assert.equal(sectionVisible(true, 1), true);
  });
});

describe("2:3 cover frame", () => {
  test("the frame keeps a 2:3 shape inside any photo", () => {
    for (const [w, h] of [
      [1200, 800],
      [600, 1800],
      [900, 1350],
    ]) {
      const rect = cropRect({ x: 0.5, y: 0.5, zoom: 1 }, w, h, 2 / 3);
      assert.ok(Math.abs(rect.width / rect.height - 2 / 3) < 0.01, `${w}x${h}`);
      assert.ok(rect.left >= 0 && rect.top >= 0 && rect.left + rect.width <= w && rect.top + rect.height <= h);
    }
  });

  test("an off-center request is pulled back inside", () => {
    const crop = clampCrop({ x: 0, y: 0, zoom: 1 }, 1200, 800, 2 / 3);
    const rect = cropRect(crop, 1200, 800, 2 / 3);
    assert.equal(rect.left, 0);
    assert.equal(rect.top, 0);
  });

  test("the circle (aspect 1) behaves as before", () => {
    const layout = cropLayout({ x: 0.5, y: 0.5, zoom: 2 }, 1000, 500, 272);
    assert.equal(layout.scale, (272 * 2) / 500);
    assert.deepEqual(cropRect({ x: 0.5, y: 0.5, zoom: 1 }, 1000, 500), { left: 250, top: 0, width: 500, height: 500 });
  });
});
