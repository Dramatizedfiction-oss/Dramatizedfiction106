import { parseDocument } from "htmlparser2";
import type {
  BlockNode,
  ContentMark,
  EpisodeDocument,
  InlineNode,
  ParagraphNode,
} from "./types";

/*
 * Stored episode HTML -> EpisodeDocument (see ./types.ts).
 *
 * This is an allowlist, not a denylist: only the supported structure is
 * produced, every attribute is discarded, and unknown elements contribute
 * their text at most. Script-like elements are dropped with their contents.
 * The result is rendered as React elements (components/episode-content), so
 * stored HTML is never injected into a page.
 *
 * Legacy bodies (the old contentEditable editor, plain text from older flows)
 * are normalized here: <div> lines become paragraphs, <b>/<i> become bold/
 * italic, every heading level becomes <h2>, the old scene-break <div> becomes
 * a scene break, a run of two or more line breaks splits a paragraph, and
 * blank lines in plain text separate paragraphs, matching how the previous
 * reader split text.
 */

type DomNode = {
  type: string;
  data?: string;
  name?: string;
  attribs?: Record<string, string>;
  children?: DomNode[];
};

const MAX_DEPTH = 120;

// Dropped together with everything inside them.
const DROPPED = new Set([
  "script", "style", "template", "iframe", "frame", "frameset", "object", "embed",
  "applet", "svg", "math", "noscript", "head", "title", "meta", "link", "base",
  "textarea", "select", "option", "button", "input", "canvas", "video", "audio",
  "img", "picture", "source", "track", "map", "area", "dialog",
]);

// Elements that group lines/blocks. Their children are parsed as blocks when
// they contain block-level elements, otherwise as one paragraph.
const CONTAINERS = new Set([
  "div", "section", "article", "main", "header", "footer", "aside", "nav", "body",
  "html", "figure", "figcaption", "center", "form", "fieldset", "details", "summary",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "ul", "ol", "li",
  "dl", "dt", "dd", "pre", "address", "hgroup",
]);

const HEADINGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const BOLD = new Set(["strong", "b"]);
const ITALIC = new Set(["em", "i"]);

// Placeholder text the previous editor could leave in a body.
const LEGACY_PLACEHOLDERS = new Set(["Start writing here.", "Start writing your episode here."]);

function isElement(node: DomNode) {
  return node.type === "tag" || node.type === "script" || node.type === "style";
}

function tagName(node: DomNode) {
  return (node.name || "").toLowerCase();
}

function isSceneBreak(node: DomNode) {
  return tagName(node) === "hr" || Boolean(node.attribs && "data-scene-break" in node.attribs);
}

function isBlockElement(node: DomNode): boolean {
  if (!isElement(node)) return false;
  const name = tagName(node);
  return (
    name === "p" ||
    name === "blockquote" ||
    HEADINGS.has(name) ||
    CONTAINERS.has(name) ||
    isSceneBreak(node)
  );
}

function withMark(marks: ContentMark[], mark: ContentMark) {
  return marks.includes(mark) ? marks : [...marks, mark].sort();
}

function parseInline(nodes: DomNode[], marks: ContentMark[], depth: number): InlineNode[] {
  if (depth > MAX_DEPTH) return [];
  const out: InlineNode[] = [];

  for (const node of nodes) {
    if (node.type === "text") {
      const text = (node.data || "").replace(/\s+/g, " ");
      if (text) out.push({ type: "text", text, marks });
      continue;
    }

    if (!isElement(node)) continue;
    const name = tagName(node);
    if (DROPPED.has(name) || isSceneBreak(node)) continue;

    if (name === "br") {
      out.push({ type: "hardBreak" });
      continue;
    }

    const nextMarks = BOLD.has(name)
      ? withMark(marks, "bold")
      : ITALIC.has(name)
        ? withMark(marks, "italic")
        : marks;

    out.push(...parseInline(node.children || [], nextMarks, depth + 1));
  }

  return out;
}

function sameMarks(a: ContentMark[], b: ContentMark[]) {
  return a.length === b.length && a.every((mark, index) => mark === b[index]);
}

/** Merges, trims and splits inline content; returns zero or more paragraphs. */
function toParagraphs(inline: InlineNode[]): ParagraphNode[] {
  const paragraphs: ParagraphNode[] = [];
  let current: InlineNode[] = [];
  let pendingBreaks = 0;

  const finish = () => {
    // Trim surrounding whitespace and line breaks.
    while (current.length && current[current.length - 1].type === "hardBreak") current.pop();
    const first = current[0];
    if (first?.type === "text") first.text = first.text.replace(/^\s+/, "");
    const last = current[current.length - 1];
    if (last?.type === "text") last.text = last.text.replace(/\s+$/, "");
    current = current.filter((node) => node.type === "hardBreak" || node.text.length > 0);

    const text = current
      .map((node) => (node.type === "text" ? node.text : ""))
      .join("")
      .trim();

    if (text && !LEGACY_PLACEHOLDERS.has(text)) {
      paragraphs.push({ type: "paragraph", children: current });
    }
    current = [];
  };

  for (const node of inline) {
    if (node.type === "hardBreak") {
      pendingBreaks += 1;
      continue;
    }

    if (!node.text.trim() && pendingBreaks > 0) {
      // Whitespace between line breaks doesn't end a run of breaks.
      continue;
    }

    if (pendingBreaks >= 2) {
      finish();
    } else if (pendingBreaks === 1 && current.length) {
      current.push({ type: "hardBreak" });
    }
    pendingBreaks = 0;

    const previous = current[current.length - 1];
    if (previous?.type === "text" && sameMarks(previous.marks, node.marks)) {
      previous.text = (previous.text + node.text).replace(/ {2,}/g, " ");
    } else {
      const text =
        previous?.type === "text" && previous.text.endsWith(" ")
          ? node.text.replace(/^ +/, "")
          : node.text;
      current.push({ type: "text", text, marks: node.marks });
    }
  }

  finish();
  return paragraphs;
}

/** Plain text at block level: blank lines separate paragraphs. */
function textToInline(text: string): InlineNode[] {
  const out: InlineNode[] = [];
  const parts = text.split(/\n[ \t\r\f\v]*\n/);
  parts.forEach((part, index) => {
    if (index > 0) out.push({ type: "hardBreak" }, { type: "hardBreak" });
    const collapsed = part.replace(/\s+/g, " ");
    if (collapsed) out.push({ type: "text", text: collapsed, marks: [] });
  });
  return out;
}

function parseBlocks(nodes: DomNode[], depth: number): BlockNode[] {
  if (depth > MAX_DEPTH) return [];
  const blocks: BlockNode[] = [];
  let inline: InlineNode[] = [];

  const flush = () => {
    if (inline.length) blocks.push(...toParagraphs(inline));
    inline = [];
  };

  for (const node of nodes) {
    if (node.type === "text") {
      inline.push(...textToInline(node.data || ""));
      continue;
    }

    if (!isElement(node)) continue;
    const name = tagName(node);
    if (DROPPED.has(name)) continue;
    const children = node.children || [];

    if (isSceneBreak(node)) {
      flush();
      // Collapse repeated scene breaks and never open with one.
      if (blocks.length && blocks[blocks.length - 1].type !== "sceneBreak") {
        blocks.push({ type: "sceneBreak" });
      }
      continue;
    }

    if (name === "p") {
      flush();
      blocks.push(...toParagraphs(parseInline(children, [], depth + 1)));
      continue;
    }

    if (HEADINGS.has(name)) {
      flush();
      for (const paragraph of toParagraphs(parseInline(children, [], depth + 1))) {
        blocks.push({ type: "heading", children: paragraph.children });
      }
      continue;
    }

    if (name === "blockquote") {
      flush();
      const quoted = parseBlocks(children, depth + 1).flatMap((block): ParagraphNode[] => {
        if (block.type === "paragraph") return [block];
        if (block.type === "heading") return [{ type: "paragraph", children: block.children }];
        if (block.type === "blockquote") return block.children;
        return [];
      });
      if (quoted.length) blocks.push({ type: "blockquote", children: quoted });
      continue;
    }

    if (CONTAINERS.has(name)) {
      flush();
      if (children.some(isBlockElement)) {
        blocks.push(...parseBlocks(children, depth + 1));
      } else {
        blocks.push(...toParagraphs(parseInline(children, [], depth + 1)));
      }
      continue;
    }

    inline.push(...parseInline([node], [], depth + 1));
  }

  flush();

  while (blocks.length && blocks[blocks.length - 1].type === "sceneBreak") blocks.pop();
  return blocks;
}

/** Parses stored episode HTML (or legacy plain text) into the content contract. */
export function parseEpisodeHtml(html: string | null | undefined): EpisodeDocument {
  if (!html) return [];
  const document = parseDocument(html, { decodeEntities: true, lowerCaseTags: true });
  return parseBlocks(document.children as unknown as DomNode[], 0);
}
