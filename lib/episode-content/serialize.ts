import type { BlockNode, EpisodeDocument, InlineNode } from "./types";

/*
 * EpisodeDocument -> canonical HTML, in the shape the Writer Studio editor
 * produces (<p>, <h2>, <blockquote><p>, <hr>, <strong>, <em>, <br>). Used to
 * hand the editor already-normalized content. Text is escaped; no attributes
 * are ever written.
 */

function escapeText(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function serializeInline(nodes: InlineNode[]) {
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "<br>";
      let html = escapeText(node.text);
      if (node.marks.includes("italic")) html = `<em>${html}</em>`;
      if (node.marks.includes("bold")) html = `<strong>${html}</strong>`;
      return html;
    })
    .join("");
}

function serializeBlock(block: BlockNode): string {
  switch (block.type) {
    case "paragraph":
      return `<p>${serializeInline(block.children)}</p>`;
    case "heading":
      return `<h2>${serializeInline(block.children)}</h2>`;
    case "blockquote":
      return `<blockquote>${block.children.map(serializeBlock).join("")}</blockquote>`;
    case "sceneBreak":
      return "<hr>";
  }
}

export function serializeEpisodeDocument(document: EpisodeDocument) {
  return document.map(serializeBlock).join("");
}
