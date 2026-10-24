import type { ReactNode } from "react";
import { isExternalHref, type Block, type Inline } from "@/lib/content/markdown";

/*
 * Draws parsed Content Markdown (lib/content/markdown.ts) as React elements:
 * no HTML strings, no dangerouslySetInnerHTML. Used by the live pages and by
 * the Administration › Content preview, so both look the same. Works in
 * server and client components (no hooks). `fill` rewrites each text run
 * (the legal pages fill their [PLACEHOLDERS] with it).
 */
type Fill = (text: string) => string;

export function InlineContent({ nodes, fill }: { nodes: Inline[]; fill?: Fill }) {
  return <>{nodes.map((node, index) => renderInline(node, index, fill))}</>;
}

function renderInline(node: Inline, key: number, fill?: Fill): ReactNode {
  switch (node.t) {
    case "text":
      return fill ? fill(node.v) : node.v;
    case "br":
      return <br key={key} />;
    case "strong":
      return (
        <strong key={key} className="font-semibold text-[var(--text-primary)]">
          <InlineContent nodes={node.c} fill={fill} />
        </strong>
      );
    case "em":
      return (
        <em key={key}>
          <InlineContent nodes={node.c} fill={fill} />
        </em>
      );
    case "link": {
      const external = isExternalHref(node.href);
      return (
        <a
          key={key}
          href={node.href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
          className="font-medium text-[var(--text-primary)] underline decoration-1 underline-offset-4 hover:decoration-2"
        >
          <InlineContent nodes={node.c} fill={fill} />
        </a>
      );
    }
  }
}

export function ContentBlock({ block, fill }: { block: Block; fill?: Fill }) {
  const text = (nodes: Inline[]) => <InlineContent nodes={nodes} fill={fill} />;
  switch (block.t) {
    case "h2":
      return <h2 className="font-heading theme-heading pt-2 text-2xl font-semibold leading-snug">{text(block.c)}</h2>;
    case "h3":
      return <h3 className="theme-heading pt-1 text-lg font-semibold leading-snug">{text(block.c)}</h3>;
    case "p":
      return <p>{text(block.c)}</p>;
    case "label":
      return <p className="theme-heading pt-1 font-semibold">{text(block.c)}</p>;
    case "ul":
    case "ol": {
      const List = block.t;
      return (
        <List className={`${block.t === "ul" ? "list-disc" : "list-decimal"} space-y-2 pl-5`}>
          {block.items.map((item, index) => (
            <li key={index}>{text(item)}</li>
          ))}
        </List>
      );
    }
    case "quote":
      // A "> " quote is a summary callout (Sweep E): write one in Administration › Content for an "In short".
      return (
        <div className="surface-callout text-base">
          <p>{text(block.c)}</p>
        </div>
      );
    case "table":
      return (
        // .legal-table (globals.css) stacks cells as labelled rows on phones; articles use it too.
        <table className="legal-table w-full text-left text-sm">
          <thead>
            <tr>
              {block.head.map((cell, index) => (
                <th key={index} scope="col">
                  {text(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, index) => (
                  <td key={index} data-label={block.head[index] ? plain(block.head[index]) : undefined}>
                    {text(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
  }
}

function plain(nodes: Inline[]): string {
  return nodes.map((node) => (node.t === "text" ? node.v : node.t === "br" ? " " : plain(node.c))).join("");
}

/** A run of blocks with the site's reading rhythm. */
export default function RenderedMarkdown({
  blocks,
  fill,
  variant = "article",
  className = "",
}: {
  blocks: Block[];
  fill?: Fill;
  /** "plain": no type styles of its own (the caller's className sets them). */
  variant?: "article" | "legal" | "plain";
  className?: string;
}) {
  const base = variant === "legal" ? "legal-body" : variant === "article" ? "theme-body text-base leading-7" : "";
  return (
    <div className={`${base} space-y-4 ${className}`}>
      {blocks.map((block, index) => (
        <ContentBlock key={index} block={block} fill={fill} />
      ))}
    </div>
  );
}
