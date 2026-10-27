import type { ReactNode } from "react";
import type { BlockNode, EpisodeDocument, InlineNode } from "@/lib/episode-content";
import type { SceneBreakDesign } from "@/lib/scene-breaks";
import SceneBreakArt from "./SceneBreakArt";

/*
 * Renders the episode content contract as React elements. Never uses
 * dangerouslySetInnerHTML: only the node types in lib/episode-content/types
 * can appear, and all text is escaped by React. Scene breaks are drawn in the
 * series' design (lib/scene-breaks.ts, chosen by the page).
 */

function renderInline(nodes: InlineNode[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.type === "hardBreak") return <br key={key} />;

    let content: ReactNode = node.text;
    if (node.marks.includes("italic")) content = <em>{content}</em>;
    if (node.marks.includes("bold")) content = <strong>{content}</strong>;
    return <span key={key}>{content}</span>;
  });
}

function renderBlock(block: BlockNode, key: string, sceneBreak: SceneBreakDesign): ReactNode {
  switch (block.type) {
    case "paragraph":
      return <p key={key}>{renderInline(block.children, key)}</p>;
    case "heading":
      return <h2 key={key}>{renderInline(block.children, key)}</h2>;
    case "blockquote":
      return (
        <blockquote key={key}>
          {block.children.map((paragraph, index) => renderBlock(paragraph, `${key}-${index}`, sceneBreak))}
        </blockquote>
      );
    case "sceneBreak":
      return <SceneBreakArt key={key} design={sceneBreak} uid={`sb-${key}`} />;
  }
}

export default function EpisodeContent({
  content,
  sceneBreak = "default",
}: {
  content: EpisodeDocument;
  sceneBreak?: SceneBreakDesign;
}) {
  return <>{content.map((block, index) => renderBlock(block, `b${index}`, sceneBreak))}</>;
}
