/*
 * The episode content contract, shared by the Writer Studio editor and the
 * reader. Episode.body is stored as HTML; only the structure below is ever
 * rendered. Anything else in stored HTML is reduced to its text (or dropped)
 * by ./parse.ts.
 *
 * Supported formatting (and the HTML each maps to):
 *   paragraph   <p>            heading     <h2>
 *   blockquote  <blockquote>   scene break <hr>
 *   bold        <strong>       italic      <em>
 *   line break  <br>
 *
 * No attributes are kept: no class, style, id, href or src. The editor
 * (components/writer-studio/editor) is configured with exactly these nodes
 * and marks, so what a writer can produce is what a reader sees.
 */

export type ContentMark = "bold" | "italic";

export type InlineNode =
  | { type: "text"; text: string; marks: ContentMark[] }
  | { type: "hardBreak" };

export type ParagraphNode = { type: "paragraph"; children: InlineNode[] };

export type BlockNode =
  | ParagraphNode
  | { type: "heading"; children: InlineNode[] }
  | { type: "blockquote"; children: ParagraphNode[] }
  | { type: "sceneBreak" };

export type EpisodeDocument = BlockNode[];
