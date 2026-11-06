import type { BlockNode, EpisodeDocument, InlineNode } from "@/lib/episode-content/types";

/*
 * Passages in an episode (Sweep I: highlights and passage comments).
 * Client-safe and pure.
 *
 * An episode's text is a list of "text blocks": each paragraph and heading
 * (paragraphs inside a blockquote too), in reading order. A block's text is
 * its text runs joined, with "\n" for a line break; that's exactly what the
 * reader renders, so the browser can measure a selection in the same terms
 * (components/reader/passages.ts).
 *
 * A passage is stored as an anchor: the exact quote plus up to CONTEXT_CHARS
 * of text before and after it inside its block, never positions. Finding it
 * again picks the occurrence whose surroundings match best, so edits
 * elsewhere (or a repeated phrase) don't move it. If the quote no longer
 * appears anywhere, the passage "was changed" and the comment or note stays.
 * A passage never crosses blocks.
 */

export const PASSAGE_MAX = 300;
export const CONTEXT_CHARS = 32;
/** The database allows a little more context than we send. */
export const CONTEXT_MAX = 64;

export type PassageAnchor = { quote: string; prefix: string; suffix: string };
export type PassageRange = { block: number; start: number; end: number };

function inlineText(nodes: InlineNode[]) {
  return nodes.map((node) => (node.type === "hardBreak" ? "\n" : node.text)).join("");
}

/** Each text block's text, in reading order (the same order the reader numbers them). */
export function textBlocks(doc: EpisodeDocument): string[] {
  const out: string[] = [];
  const visit = (block: BlockNode) => {
    if (block.type === "paragraph" || block.type === "heading") out.push(inlineText(block.children));
    else if (block.type === "blockquote") block.children.forEach(visit);
  };
  doc.forEach(visit);
  return out;
}

/** The anchor for characters [start, end) of a block's text, trimmed of surrounding spaces. */
export function anchorFromRange(blockText: string, start: number, end: number): PassageAnchor | null {
  let from = Math.max(0, Math.min(start, end));
  let to = Math.min(blockText.length, Math.max(start, end));
  while (from < to && /\s/.test(blockText[from])) from += 1;
  while (to > from && /\s/.test(blockText[to - 1])) to -= 1;
  if (to <= from) return null;
  return {
    quote: blockText.slice(from, to),
    prefix: blockText.slice(Math.max(0, from - CONTEXT_CHARS), from),
    suffix: blockText.slice(to, to + CONTEXT_CHARS),
  };
}

export type AnchorCheck = { ok: true; anchor: PassageAnchor } | { ok: false; message: string };

/** Server check for an anchor sent by the browser. */
export function parseAnchor(value: unknown): AnchorCheck {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, message: "Choose a passage first." };
  const input = value as Record<string, unknown>;
  const [quote, prefix, suffix] = [input.quote, input.prefix ?? "", input.suffix ?? ""];
  if (typeof quote !== "string" || typeof prefix !== "string" || typeof suffix !== "string") {
    return { ok: false, message: "Choose a passage first." };
  }
  // Control characters other than line breaks never appear in episode text.
  if ([quote, prefix, suffix].some((part) => /[\u0000-\u0009\u000b-\u001f\u007f]/.test(part))) {
    return { ok: false, message: "That passage couldn't be read." };
  }
  if (!quote.trim()) return { ok: false, message: "Choose a passage first." };
  if (quote.length > PASSAGE_MAX) return { ok: false, message: `Passages can be up to ${PASSAGE_MAX} characters. Choose a shorter one.` };
  if (prefix.length > CONTEXT_MAX || suffix.length > CONTEXT_MAX) return { ok: false, message: "That passage couldn't be read." };
  return { ok: true, anchor: { quote, prefix, suffix } };
}

/** How many characters of `a`'s end match `b`'s end. */
function commonSuffix(a: string, b: string) {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n += 1;
  return n;
}

function commonPrefix(a: string, b: string) {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n += 1;
  return n;
}

/** Where the passage is now, or null when the quote isn't in the episode any more. */
export function resolveAnchor(blocks: readonly string[], anchor: PassageAnchor): PassageRange | null {
  let best: PassageRange | null = null;
  let bestScore = -1;
  for (let block = 0; block < blocks.length; block += 1) {
    const text = blocks[block];
    for (let at = text.indexOf(anchor.quote); at !== -1; at = text.indexOf(anchor.quote, at + 1)) {
      const end = at + anchor.quote.length;
      const score = commonSuffix(text.slice(0, at), anchor.prefix) + commonPrefix(text.slice(end), anchor.suffix);
      if (score > bestScore) {
        best = { block, start: at, end };
        bestScore = score;
      }
    }
  }
  return best;
}

/**
 * Splits a block's text runs at passage edges: for each run, its pieces with
 * the passages (by index into `ranges`) covering each piece. Used by the
 * reader to wrap passages in marks without changing the text.
 */
export function splitRuns(runLengths: readonly number[], ranges: readonly { start: number; end: number }[]) {
  const out: { start: number; end: number; covering: number[] }[][] = [];
  let offset = 0;
  for (const length of runLengths) {
    const runStart = offset;
    const runEnd = offset + length;
    const cuts = new Set([runStart, runEnd]);
    for (const range of ranges) {
      if (range.start > runStart && range.start < runEnd) cuts.add(range.start);
      if (range.end > runStart && range.end < runEnd) cuts.add(range.end);
    }
    const points = [...cuts].sort((a, b) => a - b);
    const pieces: { start: number; end: number; covering: number[] }[] = [];
    for (let i = 0; i < points.length - 1; i += 1) {
      const [start, end] = [points[i], points[i + 1]];
      const covering = ranges.flatMap((range, index) => (range.start < end && range.end > start ? [index] : []));
      pieces.push({ start: start - runStart, end: end - runStart, covering });
    }
    if (length === 0) pieces.push({ start: 0, end: 0, covering: [] });
    out.push(pieces);
    offset = runEnd;
  }
  return out;
}

/** At most this many paragraphs show a comment count at once (the busiest ones). */
export const MAX_PASSAGE_MARKERS = 30;

/** The blocks that get a count bubble: most comments first, capped. */
export function markerBlocks(counts: ReadonlyMap<number, number>, max = MAX_PASSAGE_MARKERS) {
  return new Set(
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, max)
      .map(([block]) => block),
  );
}
