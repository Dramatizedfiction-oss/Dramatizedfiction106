import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { LEGAL_DOCUMENTS, LEGAL_LINKS, sectionId } from "@/lib/legal";
import { LEGAL_PLACEHOLDERS, fillPlaceholders, findPlaceholders } from "@/lib/legal/placeholders";

const allText = (slug: keyof typeof LEGAL_DOCUMENTS) => {
  const doc = LEGAL_DOCUMENTS[slug];
  return JSON.stringify([doc.title, doc.intro, doc.sections]);
};

describe("legal pages", () => {
  test("every page exists as a public route and is linked from the footer", () => {
    for (const link of LEGAL_LINKS) {
      const file = `app${link.href}/page.tsx`;
      assert.ok(existsSync(file), file);
      assert.doesNotMatch(readFileSync(file, "utf8"), /auth\(|requireRole|redirect\(/, `${file} must stay public`);
    }
    assert.deepEqual(LEGAL_LINKS.map((link) => link.href), ["/terms", "/privacy", "/guidelines", "/copyright", "/cookies", "/contact"]);
  });

  test("placeholders render as plain [TEXT], never escaped", () => {
    for (const slug of Object.keys(LEGAL_DOCUMENTS) as (keyof typeof LEGAL_DOCUMENTS)[]) {
      assert.doesNotMatch(allText(slug), /\\\[|&#91;|\\\]/, slug);
    }
  });

  test("unfilled placeholders show as written; filled ones are replaced everywhere", () => {
    assert.equal(fillPlaceholders("Email [CONTACT EMAIL]."), "Email [CONTACT EMAIL].");
    assert.equal(fillPlaceholders("[COPYRIGHT AGENT: name, mailing address, email]"), "[COPYRIGHT AGENT: name, mailing address, email]");
    const before = LEGAL_PLACEHOLDERS["CONTACT EMAIL"];
    LEGAL_PLACEHOLDERS["CONTACT EMAIL"] = "help@example.test";
    try {
      assert.equal(fillPlaceholders("Email [CONTACT EMAIL] or [CONTACT EMAIL]."), "Email help@example.test or help@example.test.");
    } finally {
      LEGAL_PLACEHOLDERS["CONTACT EMAIL"] = before;
    }
  });

  test("every placeholder used in the pages has an entry in the one shared map", () => {
    for (const slug of Object.keys(LEGAL_DOCUMENTS) as (keyof typeof LEGAL_DOCUMENTS)[]) {
      for (const token of findPlaceholders(allText(slug))) {
        const key = token.slice(1, -1).split(":")[0];
        assert.ok(key in LEGAL_PLACEHOLDERS, `${slug}: ${token}`);
      }
    }
  });

  test("section anchors are unique within each page", () => {
    for (const doc of Object.values(LEGAL_DOCUMENTS)) {
      const ids = doc.sections.map((section) => sectionId(section.heading));
      assert.equal(new Set(ids).size, ids.length, doc.title);
    }
  });
});
