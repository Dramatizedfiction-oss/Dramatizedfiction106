/*
 * The Markdown subset used by Administration › Content (Sweep B3). Client-safe
 * and pure: the editor's preview and the live pages both parse with this and
 * render with components/content/RenderedMarkdown, which builds React
 * elements. There is no HTML anywhere: raw "<script>" is just text, and links
 * only work for http(s), mailto and on-site paths; anything else stays text.
 *
 * Blocks (separated by blank lines):
 *   ## Heading, ### Smaller heading
 *   - bullet item          1. numbered item
 *   > quote
 *   | Column | Column |    (a table: header row, a |---| row, then rows)
 *   |---|---|
 *   **A whole line in bold** (a bold lead-in label)
 *   anything else is a paragraph; a single line break stays a line break.
 * Inline: **bold**, *italic*, [text](https://link). A backslash makes the
 * next character literal (\* \[ \| \#).
 */

export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "link"; href: string; c: Inline[] }
  | { t: "br" };

export type Block =
  | { t: "h2" | "h3" | "p" | "label" | "quote"; c: Inline[] }
  | { t: "ul" | "ol"; items: Inline[][] }
  | { t: "table"; head: Inline[][]; rows: Inline[][][] };

const ESCAPABLE = /[\\*_[\]()#|>`\-.!+]/;

/** A link target the site will follow, or null (the link then shows as plain text). */
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (/^\/(?!\/)[^\s]*$/.test(href) || /^#[\w-]+$/.test(href)) return href;
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(href)) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isExternalHref(href: string) {
  return /^https?:/i.test(href);
}

/* ------------------------------------------------------------------ inline */

function pushText(out: Inline[], text: string) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last && last.t === "text") last.v += text;
  else out.push({ t: "text", v: text });
}

/** Finds the closing delimiter at depth 0, skipping escaped characters. */
function findClose(source: string, from: number, delimiter: string) {
  for (let index = from; index < source.length; index += 1) {
    if (source[index] === "\\") {
      index += 1;
      continue;
    }
    if (source.startsWith(delimiter, index)) {
      // "**" must not close a single "*" italic and vice versa.
      if (delimiter === "*" && source[index + 1] === "*") {
        index += 1;
        continue;
      }
      return index;
    }
  }
  return -1;
}

/** The ")" that closes a link target opened just before `from`, allowing nested pairs. */
function closingParen(source: string, from: number) {
  let depth = 0;
  for (let index = from; index < source.length; index += 1) {
    if (source[index] === "\n") return -1;
    if (source[index] === "(") depth += 1;
    else if (source[index] === ")") {
      if (depth === 0) return index;
      depth -= 1;
    }
  }
  return -1;
}

export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === "\\" && index + 1 < source.length && ESCAPABLE.test(source[index + 1])) {
      pushText(out, source[index + 1]);
      index += 2;
      continue;
    }
    if (char === "\n") {
      out.push({ t: "br" });
      index += 1;
      continue;
    }
    if (source.startsWith("**", index)) {
      const close = findClose(source, index + 2, "**");
      if (close > index + 2) {
        out.push({ t: "strong", c: parseInline(source.slice(index + 2, close)) });
        index = close + 2;
        continue;
      }
    } else if (char === "*") {
      const close = findClose(source, index + 1, "*");
      if (close > index + 1 && source[index + 1] !== " ") {
        out.push({ t: "em", c: parseInline(source.slice(index + 1, close)) });
        index = close + 1;
        continue;
      }
    } else if (char === "[") {
      const closeText = findClose(source, index + 1, "]");
      if (closeText > index && source[closeText + 1] === "(") {
        const closeHref = closingParen(source, closeText + 2);
        if (closeHref > closeText) {
          const label = source.slice(index + 1, closeText);
          const href = safeHref(source.slice(closeText + 2, closeHref));
          if (href) out.push({ t: "link", href, c: parseInline(label) });
          else for (const part of parseInline(label)) out.push(part);
          index = closeHref + 1;
          continue;
        }
      }
    }
    pushText(out, char);
    index += 1;
  }
  return out;
}

export function inlineToPlain(inlines: Inline[]): string {
  return inlines
    .map((node) => {
      switch (node.t) {
        case "text":
          return node.v;
        case "br":
          return "\n";
        default:
          return inlineToPlain(node.c);
      }
    })
    .join("");
}

/* ------------------------------------------------------------------- block */

const ORDERED = /^\d+\.\s+/;
const TABLE_SEPARATOR = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "");
  const cells: string[] = [];
  let current = "";
  for (let index = 0; index < trimmed.length; index += 1) {
    if (trimmed[index] === "\\" && trimmed[index + 1] === "|") {
      current += "\\|";
      index += 1;
    } else if (trimmed[index] === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += trimmed[index];
    }
  }
  cells.push(current.trim());
  return cells.map(parseInline);
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join("\n").trim();
    paragraph = [];
    if (!text) return;
    const inline = parseInline(text);
    // A paragraph that is one bold span is a lead-in label.
    if (inline.length === 1 && inline[0].t === "strong") blocks.push({ t: "label", c: inline[0].c });
    else blocks.push({ t: "p", c: inline });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    const heading = /^(#{2,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flush();
      blocks.push({ t: heading[1].length === 2 ? "h2" : "h3", c: parseInline(heading[2].trim()) });
      continue;
    }
    if (trimmed.startsWith("- ") || ORDERED.test(trimmed)) {
      flush();
      const ordered = !trimmed.startsWith("- ");
      const items: Inline[][] = [];
      let at = index;
      while (at < lines.length) {
        const item = lines[at].trim();
        if (ordered ? !ORDERED.test(item) : !item.startsWith("- ")) break;
        items.push(parseInline(ordered ? item.replace(ORDERED, "") : item.slice(2)));
        at += 1;
      }
      blocks.push({ t: ordered ? "ol" : "ul", items });
      index = at - 1;
      continue;
    }
    if (trimmed.startsWith(">")) {
      flush();
      const quoted: string[] = [];
      let at = index;
      while (at < lines.length && lines[at].trim().startsWith(">")) {
        quoted.push(lines[at].trim().replace(/^>\s?/, ""));
        at += 1;
      }
      blocks.push({ t: "quote", c: parseInline(quoted.join("\n")) });
      index = at - 1;
      continue;
    }
    if (trimmed.startsWith("|") && TABLE_SEPARATOR.test(lines[index + 1]?.trim() ?? "")) {
      flush();
      const head = splitRow(trimmed);
      const rows: Inline[][][] = [];
      let at = index + 2;
      while (at < lines.length && lines[at].trim().startsWith("|")) {
        const cells = splitRow(lines[at]);
        rows.push(head.map((_, column) => cells[column] ?? []));
        at += 1;
      }
      blocks.push({ t: "table", head, rows });
      index = at - 1;
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return blocks;
}

/**
 * Splits a document at its "## " headings: the blocks before the first one,
 * then one section per heading (used by the legal, About and AI Usage pages).
 */
export function splitSections(blocks: Block[]) {
  const intro: Block[] = [];
  const sections: { heading: string; blocks: Block[] }[] = [];
  for (const block of blocks) {
    if (block.t === "h2") sections.push({ heading: inlineToPlain(block.c), blocks: [] });
    else if (sections.length) sections[sections.length - 1].blocks.push(block);
    else intro.push(block);
  }
  return { intro, sections };
}

/* ------------------------------------------------------ writing Markdown */

/** Plain text as Markdown that renders back to exactly that text. */
export function escapeMarkdown(text: string, { inTable = false } = {}) {
  let out = text.replace(/\\/g, "\\\\").replace(/\*/g, "\\*").replace(/\]\(/g, "]\\(");
  if (inTable) out = out.replace(/\|/g, "\\|");
  // Anything that would start a block when it begins a line.
  if (/^\d+\.\s/.test(out)) out = out.replace(/^(\d+)\./, "$1\\.");
  else if (/^(#{2,3}\s|-\s|>|\|)/.test(out)) out = `\\${out}`;
  return out;
}
