/*
 * Phone layout checks (Sweep 4). `auditPage` runs INSIDE the browser page
 * (Playwright serialises it with toString), so it must stay self-contained:
 * no imports, no closures over module values.
 *
 * What it flags, per page and viewport:
 * - hscroll: the document scrolls sideways (scrollWidth > viewport width).
 * - wide: elements reaching past the screen edge that aren't inside a
 *   container that clips or scrolls them (carousels are fine).
 * - small: tap targets under 44×44 CSS px. Inline links inside running text
 *   are exempt (WCAG 2.5.8 exception), as are visually hidden inputs whose
 *   label is the target (the label is measured instead).
 * - crowded: a small target closer than 8px to another target.
 * - tinyText: visible text under 12px.
 * - covered: a tap target whose centre is hidden under a fixed or sticky
 *   element (checked at the top of the page and scrolled to the bottom).
 * - fixedOverlap: two fixed/sticky elements on top of each other.
 * - clipped: text cut off by overflow without an ellipsis or line clamp.
 */

export type Finding = { kind: FindingKind; target: string; detail: string };
export type FindingKind = "hscroll" | "wide" | "small" | "crowded" | "tinyText" | "covered" | "fixedOverlap" | "clipped";
export const FINDING_KINDS: FindingKind[] = ["hscroll", "wide", "small", "crowded", "tinyText", "covered", "fixedOverlap", "clipped"];

/** Kinds that fail the smoke test: the page is broken, not just tight. */
export const BLOCKING_KINDS: FindingKind[] = ["hscroll", "wide", "covered", "fixedOverlap"];

export async function auditPage(): Promise<Finding[]> {
  const findings: Finding[] = [];
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const MIN = 44;
  const GAP = 8;

  const describe = (el: Element) => {
    const parts = [el.tagName.toLowerCase()];
    if (el.id) parts.push(`#${el.id}`);
    const label = el.getAttribute("aria-label");
    if (label) parts.push(`[aria-label="${label.slice(0, 40)}"]`);
    const href = el.getAttribute("href");
    if (!label && href) parts.push(`[href="${href.slice(0, 50)}"]`);
    const text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (!label && text) parts.push(`"${text}"`);
    const cls = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 3).join(".");
    if (!label && !text && cls) parts.push(`.${cls}`);
    return parts.join("");
  };

  const shown = (el: Element) => {
    if (el.closest("[aria-hidden='true'], [inert], [hidden]")) return false;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) < 0.02) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false; // sr-only and empty boxes
    // Fully transparent ancestors (closed menus that fade out).
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (Number(s.opacity) < 0.02 || s.visibility === "hidden") return false;
    }
    return true;
  };

  /** The nearest ancestor that clips or scrolls horizontally, if any. */
  const clipper = (el: Element) => {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.overflowX !== "visible") return p;
    }
    return null;
  };

  const isFixedLike = (el: Element) => {
    for (let p: Element | null = el; p && p !== document.body; p = p.parentElement) {
      const pos = getComputedStyle(p).position;
      if (pos === "fixed" || pos === "sticky") return p;
    }
    return null;
  };

  // 1. Horizontal scrolling.
  const overflow = document.documentElement.scrollWidth - vw;
  if (overflow > 1) findings.push({ kind: "hscroll", target: "document", detail: `scrollWidth exceeds the viewport by ${overflow}px` });

  // 2. Elements wider than the screen (outermost offender only).
  const all = Array.from(document.body.querySelectorAll("*"));
  const offenders = new Set<Element>();
  for (const el of all) {
    if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.right <= vw + 1 && r.left >= -1) continue;
    if (!shown(el)) continue;
    // Contained when any clipping/scrolling ancestor sits inside the screen
    // (a card in a carousel clips itself, and the carousel clips the card).
    let contained = false;
    for (let clip = clipper(el); clip; clip = clipper(clip)) {
      const cr = clip.getBoundingClientRect();
      if (cr.right <= vw + 1 && cr.left >= -1) {
        contained = true;
        break;
      }
    }
    if (contained) continue;
    const fixed = isFixedLike(el);
    if (fixed && getComputedStyle(fixed).transform !== "none") continue; // drawer parked off-screen
    offenders.add(el);
  }
  for (const el of offenders) {
    if (el.parentElement && offenders.has(el.parentElement)) continue;
    const r = el.getBoundingClientRect();
    findings.push({ kind: "wide", target: describe(el), detail: `spans ${Math.round(r.left)}…${Math.round(r.right)}px of ${vw}px` });
  }

  // 3. Tap targets.
  const selector = [
    "a[href]", "button", "input:not([type='hidden'])", "select", "textarea", "summary",
    "[role='button']", "[role='tab']", "[role='link']", "[role='menuitem']", "[role='switch']",
    "[role='checkbox']", "[role='radio']", "[role='option']",
  ].join(",");
  type Target = { el: Element; r: DOMRect };
  const targets: Target[] = [];
  const seen = new Set<Element>();
  for (const raw of Array.from(document.querySelectorAll(selector))) {
    let el: Element = raw;
    if (raw instanceof HTMLInputElement && (raw.type === "checkbox" || raw.type === "radio" || raw.type === "file")) {
      const label = raw.closest("label") || (raw.id ? document.querySelector(`label[for="${CSS.escape(raw.id)}"]`) : null);
      if (label) el = label;
    }
    if (seen.has(el)) continue;
    seen.add(el);
    if (el !== raw && !shown(el)) continue;
    if (el === raw && !shown(el)) continue;
    // A target nested inside another target counts as the outer one.
    if (el.parentElement?.closest(selector) && el.parentElement.closest(selector) !== el) continue;
    const r = el.getBoundingClientRect();
    if (r.right < 0 || r.left > vw) continue;
    const clip = clipper(el);
    if (clip) {
      const cr = clip.getBoundingClientRect();
      if (r.right <= cr.left || r.left >= cr.right) continue; // scrolled out of a carousel
    }
    targets.push({ el, r });
  }
  const inlineInText = (el: Element) => {
    if (el.tagName !== "A") return false;
    if (getComputedStyle(el).display !== "inline") return false;
    // The nearest ancestor that isn't inline is the line of text it sits in.
    let block = el.parentElement;
    while (block && getComputedStyle(block).display === "inline") block = block.parentElement;
    if (!block) return false;
    return (block.textContent || "").trim().length > (el.textContent || "").trim().length + 15;
  };
  const small = targets.filter(({ el, r }) => (r.width < MIN - 0.5 || r.height < MIN - 0.5) && !inlineInText(el));
  for (const { el, r } of small) {
    findings.push({ kind: "small", target: describe(el), detail: `${Math.round(r.width)}×${Math.round(r.height)}px` });
  }
  for (const a of small) {
    for (const b of targets) {
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const dx = Math.max(0, b.r.left - a.r.right, a.r.left - b.r.right);
      const dy = Math.max(0, b.r.top - a.r.bottom, a.r.top - b.r.bottom);
      if (dx < GAP && dy < GAP) {
        findings.push({ kind: "crowded", target: describe(a.el), detail: `${Math.round(Math.max(dx, dy))}px from ${describe(b.el)}` });
        break;
      }
    }
  }

  // 4. Tiny text.
  const tiny = new Set<Element>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent || !node.textContent.trim()) continue;
    const parent = node.parentElement;
    if (!parent || tiny.has(parent) || parent.closest("script, style, noscript, svg")) continue;
    if (parseFloat(getComputedStyle(parent).fontSize) < 11.95 && shown(parent)) tiny.add(parent);
  }
  for (const el of tiny) {
    findings.push({ kind: "tinyText", target: describe(el), detail: `${getComputedStyle(el).fontSize}` });
  }

  // 5. Clipped text.
  for (const el of all) {
    const s = getComputedStyle(el);
    if (s.overflowX === "visible" && s.overflowY === "visible") continue;
    if (s.overflowX === "auto" || s.overflowX === "scroll" || s.overflowY === "auto" || s.overflowY === "scroll") continue;
    if (s.textOverflow === "ellipsis" || (s as any).webkitLineClamp !== "none") continue;
    const ownText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent && n.textContent.trim());
    if (!ownText) continue;
    if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 4) {
      if (!shown(el)) continue;
      findings.push({ kind: "clipped", target: describe(el), detail: `content ${el.scrollWidth}×${el.scrollHeight} in ${el.clientWidth}×${el.clientHeight}` });
    }
  }

  // 6. Fixed/sticky elements on top of each other.
  const fixedEls = all.filter((el) => {
    const pos = getComputedStyle(el).position;
    if (pos !== "fixed" && pos !== "sticky") return false;
    if (!shown(el)) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  });
  for (let i = 0; i < fixedEls.length; i += 1) {
    for (let j = i + 1; j < fixedEls.length; j += 1) {
      const a = fixedEls[i];
      const b = fixedEls[j];
      if (a.contains(b) || b.contains(a)) continue;
      // A modal dialog is drawn in the top layer, above everything else, by design.
      const inModal = (el: Element) => Boolean(el.closest("dialog[open], [aria-modal='true']"));
      if (inModal(a) !== inModal(b)) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      // Sticky children of a full-height column (the desktop rail) overlap by design: skip full-viewport layers.
      if (ra.height >= vh - 1 && ra.width >= vw - 1) continue;
      if (rb.height >= vh - 1 && rb.width >= vw - 1) continue;
      if (w > 2 && h > 2) findings.push({ kind: "fixedOverlap", target: describe(a), detail: `overlaps ${describe(b)} by ${Math.round(w)}×${Math.round(h)}px` });
    }
  }

  // 7. Targets hidden under fixed/sticky layers. At the top of the page any
  // layer counts (nothing should start under a bar); scrolled to the bottom,
  // only bars anchored to the bottom (content scrolling under a sticky
  // header is normal, but the last items must clear a bottom bar). With a
  // modal open, only its own targets are checked.
  const modal =
    // An open menu covers what's under it on purpose, like a modal.
    Array.from(document.querySelectorAll("dialog[open], [aria-modal='true'], [role='menu']")).find(
      (el) => (el.tagName !== "DIALOG" || el.matches(":modal")) && shown(el),
    ) ?? null;
  const covered = new Set<Element>();
  const checkCovered = (where: "top" | "bottom") => {
    for (const { el } of targets) {
      if (modal && !modal.contains(el)) continue;
      if (covered.has(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= vh || r.width < 2) continue;
      const x = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1);
      const y = Math.min(Math.max(r.top + r.height / 2, 1), vh - 1);
      const hit = document.elementFromPoint(x, y);
      if (!hit || el.contains(hit) || hit.contains(el)) continue;
      const layer = isFixedLike(hit);
      if (!layer || layer.contains(el) || isFixedLike(el) === layer) continue;
      // A sticky footer floats over content until you scroll (normal); what
      // matters is that nothing STARTS under a top bar and nothing at the END
      // stays under a bottom bar.
      const lr = layer.getBoundingClientRect();
      const bottomBar = lr.bottom >= vh - 2 && lr.top >= vh / 2;
      if (where === "bottom" ? !bottomBar : bottomBar) continue;
      covered.add(el);
      findings.push({ kind: "covered", target: describe(el), detail: `under ${describe(layer)}` });
    }
  };
  const startY = window.scrollY;
  // "Nothing starts under a bar" only holds at the top; an interaction may have scrolled the page.
  if (startY <= 1) checkCovered("top");
  if (!modal) {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" as ScrollBehavior });
    await new Promise((resolve) => setTimeout(resolve, 150));
    checkCovered("bottom");
  }
  window.scrollTo({ top: startY, behavior: "instant" as ScrollBehavior });

  return findings;
}
