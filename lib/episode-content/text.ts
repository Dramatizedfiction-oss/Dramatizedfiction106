import type { BlockNode, EpisodeDocument, InlineNode } from "./types";

/*
 * Text helpers shared by the editor (client) and server pages. No parser
 * import here, so this module stays small enough for the client bundle.
 */

const WORDS_PER_MINUTE = 220;

function inlineText(nodes: InlineNode[]) {
  return nodes.map((node) => (node.type === "text" ? node.text : "\n")).join("");
}

function blockText(block: BlockNode): string {
  switch (block.type) {
    case "paragraph":
    case "heading":
      return inlineText(block.children);
    case "blockquote":
      return block.children.map(blockText).join("\n\n");
    case "sceneBreak":
      return "";
  }
}

/** Readable plain text: blocks separated by blank lines. */
export function documentToPlainText(document: EpisodeDocument) {
  return document
    .map(blockText)
    .filter((text) => text.trim().length > 0)
    .join("\n\n");
}

export function countWords(text: string) {
  const matches = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return matches ? matches.length : 0;
}

/** Whole minutes, at least 1. */
export function estimateReadTime(wordCount: number) {
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

/** The first `maxWords` words of plain text, with an ellipsis when cut. */
export function excerptText(text: string, maxWords = 60) {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}
