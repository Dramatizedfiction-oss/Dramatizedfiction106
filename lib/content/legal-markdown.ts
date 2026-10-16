import { escapeMarkdown } from "@/lib/content/markdown";
import type { LegalBlock, LegalDocument } from "@/lib/legal/types";

/*
 * Turns the approved legal pages (lib/legal/content/*.ts) into Content
 * Markdown, word for word. Used for their built-in defaults and the first
 * seeded version; tests/unit/content-markdown.test.ts proves the result parses
 * back to exactly the same text.
 */

function blockToMarkdown(block: LegalBlock): string {
  switch (block.type) {
    case "p":
      return escapeMarkdown(block.text);
    case "label":
      return `**${escapeMarkdown(block.text)}**`;
    case "ul":
      return block.items.map((item) => `- ${escapeMarkdown(item)}`).join("\n");
    case "ol":
      return block.items.map((item, index) => `${index + 1}. ${escapeMarkdown(item)}`).join("\n");
    case "quote":
      return `> ${escapeMarkdown(block.text)}`;
    case "table": {
      const row = (cells: string[]) => `| ${cells.map((cell) => escapeMarkdown(cell, { inTable: true })).join(" | ")} |`;
      return [row(block.columns), `|${block.columns.map(() => "---").join("|")}|`, ...block.rows.map(row)].join("\n");
    }
  }
}

export function legalBodyToMarkdown(document: LegalDocument): string {
  const parts = document.intro.map(blockToMarkdown);
  for (const section of document.sections) {
    parts.push(`## ${escapeMarkdown(section.heading)}`, ...section.blocks.map(blockToMarkdown));
  }
  return parts.join("\n\n");
}
