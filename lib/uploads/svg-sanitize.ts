import { parseDocument } from "htmlparser2";

/*
 * A strict SVG allow-list (Sweep I, Store frames). Server-only; pure (no
 * I/O), so it's unit-tested directly.
 *
 * The uploaded SVG is parsed and rebuilt from scratch: only the drawing
 * elements and attributes below survive. Scripts, event handlers, <style>,
 * style attributes, <foreignObject>, <image>, entities and any reference to
 * something outside the file (href / url() not starting with "#") are
 * dropped, as is all text. The result is then rasterised to WebP
 * (lib/uploads/frame-image.ts), so an uploaded SVG is never served as SVG.
 */

const ELEMENTS = new Set([
  "svg", "g", "defs", "symbol", "use", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon",
  "lineargradient", "radialgradient", "stop", "clippath", "mask", "pattern",
]);

const ATTRIBUTES = new Set([
  "id", "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "fx", "fy", "fr", "width", "height",
  "points", "viewbox", "preserveaspectratio", "transform", "fill", "fill-opacity", "fill-rule", "stroke",
  "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "stroke-dashoffset", "stroke-miterlimit",
  "stroke-opacity", "opacity", "clip-path", "clip-rule", "mask", "offset", "stop-color", "stop-opacity",
  "gradientunits", "gradienttransform", "spreadmethod", "clippathunits", "maskunits", "maskcontentunits",
  "patternunits", "patterncontentunits", "patterntransform", "href", "xlink:href", "xmlns", "xmlns:xlink", "version",
]);

/** SVG's camelCase spellings, restored on output (the parser lower-cases names). */
const CASE: Record<string, string> = {
  lineargradient: "linearGradient",
  radialgradient: "radialGradient",
  clippath: "clipPath",
  viewbox: "viewBox",
  preserveaspectratio: "preserveAspectRatio",
  gradientunits: "gradientUnits",
  gradienttransform: "gradientTransform",
  spreadmethod: "spreadMethod",
  clippathunits: "clipPathUnits",
  maskunits: "maskUnits",
  maskcontentunits: "maskContentUnits",
  patternunits: "patternUnits",
  patterncontentunits: "patternContentUnits",
  patterntransform: "patternTransform",
};

export const SVG_MAX_BYTES = 200 * 1024;
const MAX_ELEMENTS = 5000;
/** At most this many <use> copies in one frame (Sweep 1). */
export const MAX_USES = 200;

type Node = { type: string; name?: string; attribs?: Record<string, string>; children?: Node[] };

function safeValue(name: string, value: string): boolean {
  const v = value.trim();
  if (v.length > 20_000) return false;
  if (/[<>]/.test(v) || /(javascript|data|vbscript)\s*:/i.test(v) || /expression\s*\(/i.test(v)) return false;
  if (name === "href" || name === "xlink:href") return /^#[\w.-]+$/.test(v);
  if (name === "xmlns") return v === "http://www.w3.org/2000/svg";
  if (name === "xmlns:xlink") return v === "http://www.w3.org/1999/xlink";
  // Paint and references may only point inside the file: url(#id).
  const urls = v.match(/url\s*\(([^)]*)\)/gi) ?? [];
  return urls.every((u) => /^url\s*\(\s*['"]?#[\w.-]+['"]?\s*\)$/i.test(u));
}

const escapeAttr = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/** The cleaned SVG, or null when there's no usable <svg> root. */
export function sanitizeSvg(source: string): string | null {
  if (Buffer.byteLength(source, "utf8") > SVG_MAX_BYTES) return null;
  const doc = parseDocument(source, { xmlMode: true, decodeEntities: true }) as unknown as Node;
  const root = (doc.children ?? []).find((node) => node.type === "tag" && node.name?.toLowerCase() === "svg");
  if (!root) return null;
  let count = 0;

  // Sweep 1: <use> copies are capped, and a <use> may not point at anything
  // that itself contains a <use>. Nested copies multiply (10 x 10 x 10 ...),
  // which can keep the renderer busy for minutes from a file of a few KB.
  const tagName = (node: Node) => (node.type === "tag" && node.name ? node.name.toLowerCase() : "");
  const hasUse = (node: Node): boolean => tagName(node) === "use" || (node.children ?? []).some(hasUse);
  const amplifying = new Set<string>();
  let uses = 0;
  (function index(node: Node) {
    if (tagName(node) === "use") uses++;
    const id = node.attribs?.id;
    if (id && hasUse(node)) amplifying.add(id);
    (node.children ?? []).forEach(index);
  })(root);
  if (uses > MAX_USES) return null;
  const referencedId = (attribs: Record<string, string> | undefined) => {
    const ref = attribs?.href ?? attribs?.["xlink:href"] ?? "";
    return ref.startsWith("#") ? ref.slice(1) : null;
  };

  function build(node: Node): string {
    if (node.type !== "tag" || !node.name) return "";
    const name = node.name.toLowerCase();
    if (!ELEMENTS.has(name) || ++count > MAX_ELEMENTS) return "";
    if (name === "use") {
      const target = referencedId(node.attribs);
      if (!target || amplifying.has(target)) return "";
    }
    const attrs = Object.entries(node.attribs ?? {})
      .map(([key, value]) => [key.toLowerCase(), value] as const)
      .filter(([key, value]) => ATTRIBUTES.has(key) && safeValue(key, value))
      .map(([key, value]) => ` ${CASE[key] ?? key}="${escapeAttr(value)}"`)
      .join("");
    const inner = (node.children ?? []).map(build).join("");
    const tag = CASE[name] ?? name;
    return inner ? `<${tag}${attrs}>${inner}</${tag}>` : `<${tag}${attrs}/>`;
  }

  const out = build(root);
  if (count > MAX_ELEMENTS) return null;
  // Always a proper SVG namespace, so the renderer reads it as SVG.
  return out.replace(/^<svg(?![^>]*\sxmlns=)/, '<svg xmlns="http://www.w3.org/2000/svg"');
}

/** True when the bytes look like an SVG document (XML/svg start, after an optional BOM and whitespace). */
export function looksLikeSvg(bytes: Buffer) {
  const head = bytes.subarray(0, 512).toString("utf8").replace(/^﻿/, "").trimStart().toLowerCase();
  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg")) || (head.startsWith("<!--") && head.includes("<svg"));
}
