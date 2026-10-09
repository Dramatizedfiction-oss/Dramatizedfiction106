import type { CSSProperties } from "react";
import type { FilterStyle } from "@/lib/filter-styles.config";
import { filterStyleModel } from "@/lib/filter-styles";

/*
 * One genre or sort option drawn in its own style (lib/filter-styles.config.ts).
 * Effects live in app/globals.css under "Explore filter styles" and are switched
 * on by the data-fx-* attributes.
 */
export default function FilterOptionLabel({
  style,
  selected = false,
}: {
  style: FilterStyle;
  /** Plays the one-time glyph pop for styles that have it. */
  selected?: boolean;
}) {
  const model = filterStyleModel(style);

  return (
    <span className="fx" {...model.attrs} style={model.style as CSSProperties}>
      {model.glyph ? (
        <span
          aria-hidden="true"
          className={`fx-glyph ${model.popGlyph && selected ? "fx-glyph-pop" : ""}`.trim()}
        >
          <Glyph glyph={model.glyph} />
        </span>
      ) : null}
      <span className="fx-text">{model.label}</span>
    </span>
  );
}

function Glyph({ glyph }: { glyph: string }) {
  if (glyph === "svg:magnifier") {
    return (
      <svg viewBox="0 0 16 16" width="0.95em" height="0.95em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="6.75" cy="6.75" r="4.5" />
        <path d="M10.2 10.2 14 14" />
      </svg>
    );
  }
  if (glyph === "svg:flame") {
    return (
      <svg viewBox="0 0 16 16" width="0.95em" height="0.95em" fill="currentColor">
        <path d="M8.6 1.2c.3 2.1-.8 3.3-1.9 4.5C5.6 6.9 4.5 8.1 4.5 10a3.5 3.5 0 0 0 7 0c0-1.1-.4-2-.9-2.8-.2.9-.7 1.5-1.4 1.8.4-2.6-.2-5.3-.6-7.8Z" />
      </svg>
    );
  }
  return <>{glyph}</>;
}
