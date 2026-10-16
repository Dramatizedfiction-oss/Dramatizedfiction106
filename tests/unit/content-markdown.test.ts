import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { legalBodyToMarkdown } from "@/lib/content/legal-markdown";
import { inlineToPlain, parseInline, parseMarkdown, safeHref, splitSections, type Block } from "@/lib/content/markdown";
import { CONTENT_DEFS, getContentDef, validateContent } from "@/lib/content/registry";
import { LEGAL_DOCUMENTS } from "@/lib/legal";
import type { LegalBlock } from "@/lib/legal/types";

/** A parsed block as the old legal block shape (plain text), to compare with the approved source. */
function toLegal(block: Block): LegalBlock {
  switch (block.t) {
    case "p":
      return { type: "p", text: inlineToPlain(block.c) };
    case "label":
      return { type: "label", text: inlineToPlain(block.c) };
    case "quote":
      return { type: "quote", text: inlineToPlain(block.c) };
    case "ul":
    case "ol":
      return { type: block.t, items: block.items.map(inlineToPlain) };
    case "table":
      return { type: "table", columns: block.head.map(inlineToPlain), rows: block.rows.map((row) => row.map(inlineToPlain)) };
    default:
      throw new Error(`Unexpected ${block.t} in a legal body.`);
  }
}

describe("Content Markdown (Sweep B3)", () => {
  test("every legal page converts to Markdown and parses back word for word", () => {
    for (const [slug, document] of Object.entries(LEGAL_DOCUMENTS)) {
      const { intro, sections } = splitSections(parseMarkdown(legalBodyToMarkdown(document)));
      assert.deepEqual(intro.map(toLegal), document.intro, `${slug} intro`);
      assert.deepEqual(
        sections.map((section) => ({ heading: section.heading, blocks: section.blocks.map(toLegal) })),
        document.sections,
        `${slug} sections`,
      );
    }
  });

  test("tricky text survives escaping", async () => {
    const { escapeMarkdown } = await import("@/lib/content/markdown");
    for (const text of ["1. not a list", "- not a bullet", "## not a heading", "> not a quote", "| not a table", "a *star* and [x](y) and \\ back"]) {
      const block = parseMarkdown(escapeMarkdown(text))[0] as Extract<Block, { c: unknown }>;
      assert.equal(block.t, "p", text);
      assert.equal(inlineToPlain(block.c), text);
    }
  });

  test("no HTML, no scripts, no unsafe links", () => {
    const [block] = parseMarkdown('<script>alert(1)</script> <img src=x onerror=alert(1)>');
    assert.deepEqual(block, { t: "p", c: [{ t: "text", v: "<script>alert(1)</script> <img src=x onerror=alert(1)>" }] });

    for (const href of ["javascript:alert(1)", "JAVASCRIPT:alert(1)", "data:text/html,x", "//evil.example", "vbscript:x", " javascript:x"]) {
      assert.equal(safeHref(href), null, href);
      assert.deepEqual(parseInline(`[click](${href})`), [{ t: "text", v: "click" }], href);
    }
    assert.equal(safeHref("/explore"), "/explore");
    assert.equal(safeHref("https://example.com/a"), "https://example.com/a");
    assert.equal(safeHref("mailto:hi@example.com"), "mailto:hi@example.com");
  });

  test("formatting parses", () => {
    assert.deepEqual(parseInline("**bold** and *it* [site](/explore)"), [
      { t: "strong", c: [{ t: "text", v: "bold" }] },
      { t: "text", v: " and " },
      { t: "em", c: [{ t: "text", v: "it" }] },
      { t: "text", v: " " },
      { t: "link", href: "/explore", c: [{ t: "text", v: "site" }] },
    ]);
    const blocks = parseMarkdown("## Title\n\n- one\n- two\n\n1. a\n2. b\n\n| A | B |\n|---|---|\n| 1 | 2 \\| 3 |\n\nline one\nline two");
    assert.deepEqual(blocks.map((block) => block.t), ["h2", "ul", "ol", "table", "p"]);
    const table = blocks[3] as Extract<Block, { t: "table" }>;
    assert.equal(inlineToPlain(table.rows[0][1]), "2 | 3");
    assert.ok((blocks[4] as { c: { t: string }[] }).c.some((node) => node.t === "br"));
  });
});

describe("Content registry", () => {
  test("keys are unique and every built-in default is valid", () => {
    assert.equal(new Set(CONTENT_DEFS.map((def) => def.key)).size, CONTENT_DEFS.length);
    for (const def of CONTENT_DEFS) {
      const check = validateContent(def, def.defaults);
      assert.ok(check.ok, `${def.key}: ${check.ok ? "" : check.message}`);
    }
  });

  test("validation refuses unknown fields, wrong types, unsafe links and overlong text", () => {
    const banner = getContentDef("site.announcement")!;
    const base = { enabled: false, text: "", linkLabel: "", linkHref: "" };
    assert.equal(validateContent(banner, { ...base, extra: "x" }).ok, false);
    assert.equal(validateContent(banner, { ...base, enabled: "yes" }).ok, false);
    assert.equal(validateContent(banner, { ...base, linkLabel: "Go", linkHref: "javascript:alert(1)" }).ok, false);
    assert.equal(validateContent(banner, { ...base, enabled: true }).ok, false, "on with no message");
    assert.equal(validateContent(banner, { ...base, enabled: true, text: "Hi", linkLabel: "Go" }).ok, false, "link text without a link");
    assert.equal(validateContent(banner, { ...base, enabled: true, text: "Hi", linkLabel: "Go", linkHref: "/explore" }).ok, true);
    assert.equal(validateContent(banner, { ...base, text: "x".repeat(161) }).ok, false);
    assert.equal(validateContent(banner, null).ok, false);
    assert.equal(validateContent(banner, []).ok, false);

    const onboarding = getContentDef("article.writer-onboarding")!;
    assert.equal(validateContent(onboarding, { title: " ", quick: "a", deep: "b" }).ok, false, "required");
    const cleaned = validateContent(onboarding, { title: "  Hi\u0007 ", quick: "a\r\nb", deep: "c" });
    assert.deepEqual(cleaned, { ok: true, values: { title: "Hi", quick: "a\nb", deep: "c" } });
  });
});
