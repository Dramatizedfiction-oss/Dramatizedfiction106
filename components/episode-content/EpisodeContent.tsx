import type { ReactNode } from "react";
import type { BlockNode, EpisodeDocument, InlineNode } from "@/lib/episode-content";
import type { SceneBreakDesign } from "@/lib/scene-breaks";
import { splitRuns } from "@/lib/text-anchor";
import SceneBreakArt from "./SceneBreakArt";

/*
 * Renders the episode content contract as React elements. Never uses
 * dangerouslySetInnerHTML: only the node types in lib/episode-content/types
 * can appear, and all text is escaped by React. Scene breaks are drawn in the
 * series' design (lib/scene-breaks.ts, chosen by the page).
 *
 * Passages (Sweep I): every paragraph and heading carries data-block (its
 * place among the text blocks, lib/text-anchor.ts textBlocks), so a selection
 * can be measured in the same terms the server stores. `passages` wraps
 * commented or linked passages in <mark> (no look of their own until a
 * reader taps them), and `markers` adds a small comment count to a block.
 * Interaction lives in components/reader/PassageLayer.tsx.
 */

export type RenderedPassage = { block: number; start: number; end: number; ids: string[]; target?: boolean };

type Ctx = { sceneBreak: SceneBreakDesign; next: number; passages: Map<number, RenderedPassage[]>; markers: Record<number, number> };

function renderInline(nodes: InlineNode[], keyPrefix: string, ranges: RenderedPassage[]): ReactNode[] {
  const pieces = ranges.length ? splitRuns(nodes.map((node) => (node.type === "hardBreak" ? 1 : node.text.length)), ranges) : null;
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.type === "hardBreak") return <br key={key} />;

    const wrap = (text: string): ReactNode => {
      let content: ReactNode = text;
      if (node.marks.includes("italic")) content = <em>{content}</em>;
      if (node.marks.includes("bold")) content = <strong>{content}</strong>;
      return content;
    };
    if (!pieces) return <span key={key}>{wrap(node.text)}</span>;

    return (
      <span key={key}>
        {pieces[index].map((piece, pieceIndex) => {
          const text = node.text.slice(piece.start, piece.end);
          if (!piece.covering.length) return <span key={pieceIndex}>{wrap(text)}</span>;
          const covering = piece.covering.map((i) => ranges[i]);
          const target = covering.some((range) => range.target);
          return (
            <mark
              key={pieceIndex}
              className={`passage-mark${target ? " passage-target" : ""}`}
              data-passage-ids={covering.flatMap((range) => range.ids).join(" ")}
            >
              {wrap(text)}
            </mark>
          );
        })}
      </span>
    );
  });
}

function Count({ block, count }: { block: number; count: number }) {
  return (
    <button
      type="button"
      className="passage-count"
      data-passage-block={block}
      aria-label={`${count} comment${count === 1 ? "" : "s"} on this paragraph`}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" />
      </svg>
      {count}
    </button>
  );
}

function renderText(kind: "p" | "h2", children: InlineNode[], key: string, ctx: Ctx): ReactNode {
  const block = ctx.next++;
  const Tag = kind;
  const count = ctx.markers[block];
  return (
    <Tag key={key} data-block={block}>
      {renderInline(children, key, ctx.passages.get(block) ?? [])}
      {count ? <Count block={block} count={count} /> : null}
    </Tag>
  );
}

function renderBlock(block: BlockNode, key: string, ctx: Ctx): ReactNode {
  switch (block.type) {
    case "paragraph":
      return renderText("p", block.children, key, ctx);
    case "heading":
      return renderText("h2", block.children, key, ctx);
    case "blockquote":
      return <blockquote key={key}>{block.children.map((paragraph, index) => renderBlock(paragraph, `${key}-${index}`, ctx))}</blockquote>;
    case "sceneBreak":
      return <SceneBreakArt key={key} design={ctx.sceneBreak} uid={`sb-${key}`} />;
  }
}

export default function EpisodeContent({
  content,
  sceneBreak = "default",
  passages = [],
  markers = {},
}: {
  content: EpisodeDocument;
  sceneBreak?: SceneBreakDesign;
  passages?: RenderedPassage[];
  /** Block → number of passage comments in it (only the blocks that show a count). */
  markers?: Record<number, number>;
}) {
  const byBlock = new Map<number, RenderedPassage[]>();
  for (const passage of passages) byBlock.set(passage.block, [...(byBlock.get(passage.block) ?? []), passage]);
  const ctx: Ctx = { sceneBreak, next: 0, passages: byBlock, markers };
  return <>{content.map((block, index) => renderBlock(block, `b${index}`, ctx))}</>;
}
