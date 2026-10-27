import { createElement, type CSSProperties, type ReactNode } from "react";
import { sceneBreakSvg, type SceneBreakDesign, type SvgNode } from "@/lib/scene-breaks";

/*
 * One scene break, drawn for the series' genre (lib/scene-breaks.ts). The
 * separator is announced as "Scene break"; the drawing itself is decorative.
 * No hooks, so it renders on the server (reader, preview) as well.
 */

const camel = (name: string) => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

function toReact(node: SvgNode, key?: string): ReactNode {
  const props: Record<string, unknown> = { key };
  for (const [name, value] of Object.entries(node.attrs)) {
    if (name === "class") props.className = value;
    else if (name.startsWith("aria-")) props[name] = value;
    else props[camel(name)] = value;
  }
  if (node.style) {
    const style: Record<string, string | number> = {};
    for (const [name, value] of Object.entries(node.style)) style[camel(name)] = value;
    props.style = style as CSSProperties;
  }
  return createElement(node.tag, props, ...(node.children ?? []).map((child, index) => toReact(child, String(index))));
}

export default function SceneBreakArt({ design, uid }: { design: SceneBreakDesign; uid: string }) {
  return (
    <div role="separator" aria-label="Scene break" className="scene-break" data-design={design}>
      {toReact(sceneBreakSvg(design, uid))}
    </div>
  );
}
