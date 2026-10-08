import type { ReactNode } from "react";
import type { BlockNode, EpisodeDocument, InlineNode } from "@/lib/episode-content";

/*
 * Renders the episode content contract as React elements. Never uses
 * dangerouslySetInnerHTML: only the node types in lib/episode-content/types
 * can appear, and all text is escaped by React.
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

function renderBlock(block: BlockNode, key: string): ReactNode {
  switch (block.type) {
    case "paragraph":
      return <p key={key}>{renderInline(block.children, key)}</p>;
    case "heading":
      return <h2 key={key}>{renderInline(block.children, key)}</h2>;
    case "blockquote":
      return (
        <blockquote key={key}>
          {block.children.map((paragraph, index) => renderBlock(paragraph, `${key}-${index}`))}
        </blockquote>
      );
    case "sceneBreak":
      return <hr key={key} aria-label="Scene break" />;
  }
}

export default function EpisodeContent({ content }: { content: EpisodeDocument }) {
  return <>{content.map((block, index) => renderBlock(block, `b${index}`))}</>;
}
