import { Extension } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import { sceneBreakSvg, type SceneBreakDesign, type SvgNode } from "@/lib/scene-breaks";

/*
 * Shows scene breaks in the editor exactly as readers will see them (the
 * series' design, lib/scene-breaks.ts). Display only: this is a node view for
 * StarterKit's horizontalRule node, so the saved HTML stays a plain <hr>
 * (getHTML() uses the node's schema, not its view). Inserting a break is
 * unchanged: the toolbar's scene-break button or typing "---".
 */

const SVG_NS = "http://www.w3.org/2000/svg";
let viewCount = 0;

function build(node: SvgNode): Element {
  const element = document.createElementNS(SVG_NS, node.tag);
  for (const [name, value] of Object.entries(node.attrs)) element.setAttribute(name, String(value));
  for (const [name, value] of Object.entries(node.style ?? {})) {
    (element as SVGElement).style.setProperty(name, String(value));
  }
  for (const child of node.children ?? []) element.appendChild(build(child));
  return element;
}

export const SceneBreakView = Extension.create<{ design: SceneBreakDesign; note: string | null }>({
  name: "sceneBreakView",

  addOptions() {
    return { design: "default", note: null };
  },

  addProseMirrorPlugins() {
    const { design, note } = this.options;
    return [
      new Plugin({
        props: {
          nodeViews: {
            horizontalRule: () => {
              const dom = document.createElement("div");
              dom.className = "scene-break";
              dom.setAttribute("role", "separator");
              dom.setAttribute("aria-label", "Scene break");
              dom.dataset.design = design;
              viewCount += 1;
              dom.appendChild(build(sceneBreakSvg(design, `sbe-${viewCount}`)));
              if (note) {
                const caption = document.createElement("span");
                caption.className = "scene-break-note";
                caption.textContent = note;
                dom.appendChild(caption);
              }
              return { dom, ignoreMutation: () => true };
            },
          },
        },
      }),
    ];
  },
});
