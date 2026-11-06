"use client";

import { anchorFromRange, resolveAnchor, type PassageAnchor } from "@/lib/text-anchor";

/*
 * Browser side of passages (Sweep I). The reader's text blocks carry
 * data-block (components/episode-content/EpisodeContent.tsx); a block's text
 * is measured exactly like lib/text-anchor.ts textBlocks: text runs, "\n" for
 * <br>, and the comment-count buttons left out.
 */

const COUNT_SELECTOR = ".passage-count";

/** Text of a DOM fragment or element in block terms. */
function textOf(root: Node): string {
  let out = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) out += node.nodeValue ?? "";
    else if (node instanceof Element) {
      if (node.matches(COUNT_SELECTOR)) return;
      if (node.tagName === "BR") out += "\n";
      else node.childNodes.forEach(walk);
    } else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) node.childNodes.forEach(walk);
  };
  walk(root);
  return out;
}

export function blockOf(node: Node | null, root: HTMLElement): HTMLElement | null {
  const element = node instanceof Element ? node : node?.parentElement ?? null;
  const block = element?.closest<HTMLElement>("[data-block]") ?? null;
  return block && root.contains(block) ? block : null;
}

/** Character offset of (node, offset) inside a block, in block terms. */
function offsetIn(block: HTMLElement, node: Node, offset: number) {
  const range = document.createRange();
  range.setStart(block, 0);
  range.setEnd(node, offset);
  return textOf(range.cloneContents()).length;
}

export type SelectedPassage = { anchor: PassageAnchor; block: HTMLElement; tooLong: boolean; rect: DOMRect };

/** The current selection as a passage, or null when it isn't inside one block of `root`. */
export function readSelection(root: HTMLElement, max: number): SelectedPassage | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const block = blockOf(range.startContainer, root);
  if (!block || blockOf(range.endContainer, root) !== block) return null;
  const text = textOf(block);
  const anchor = anchorFromRange(text, offsetIn(block, range.startContainer, range.startOffset), offsetIn(block, range.endContainer, range.endOffset));
  if (!anchor) return null;
  return { anchor, block, tooLong: anchor.quote.length > max, rect: range.getBoundingClientRect() };
}

/** Briefly highlights an element (CSS .passage-flash; no motion when reduced). */
export function flash(element: Element) {
  element.classList.remove("passage-flash");
  // Restart the animation.
  void (element as HTMLElement).offsetWidth;
  element.classList.add("passage-flash");
  window.setTimeout(() => element.classList.remove("passage-flash"), 2400);
}

/**
 * Scrolls to a passage and flashes it: the marks of a comment by id when the
 * page drew them, else the block the anchor is found in now. False when the
 * passage isn't in the episode any more.
 */
export function goToPassage(root: HTMLElement, options: { commentId?: string; anchor?: PassageAnchor }) {
  const marks = options.commentId ? [...root.querySelectorAll(`mark[data-passage-ids~="${CSS.escape(options.commentId)}"]`)] : [];
  if (marks.length) {
    marks[0].scrollIntoView({ block: "center", behavior: smooth() });
    marks.forEach(flash);
    return true;
  }
  if (!options.anchor) return false;
  const blocks = [...root.querySelectorAll<HTMLElement>("[data-block]")];
  const found = resolveAnchor(blocks.map(textOf), options.anchor);
  if (!found) return false;
  const element = blocks[found.block];
  element.scrollIntoView({ block: "center", behavior: smooth() });
  flash(element);
  return true;
}

function smooth(): ScrollBehavior {
  const reduced =
    document.documentElement.getAttribute("data-reduce-motion") === "always" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return reduced ? "auto" : "smooth";
}

/** Fired by the passage composer so the comments list can show the new comment at once. */
export const COMMENT_ADDED_EVENT = "df:comment-added";
