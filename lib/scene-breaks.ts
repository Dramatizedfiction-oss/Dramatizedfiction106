/*
 * Genre scene breaks (Sweep F). A scene break is stored as one generic block
 * (<hr>, see lib/episode-content); its look is chosen here at display time
 * from the series, so changing the genre restyles every break and no stored
 * text changes. Client-safe and pure: the designs are plain shape data drawn
 * by components/episode-content/SceneBreakArt.tsx (reader, preview) and by the
 * editor's scene-break view (components/writer-studio/editor).
 *
 * Choice: the first of the series' sub tags that has a design (in the
 * writer's order), else the genre, else the default. Every design fits the
 * same 200x48 box, so switching genres never moves the text.
 */

export const SCENE_BREAK_DESIGNS = [
  "default",
  "fantasy",
  "scifi",
  "romance",
  "mystery",
  "horror",
  "thriller",
  "historical",
  "comedy",
  "drama",
  "literary",
  "youngAdult",
  "dystopian",
  "urbanFantasy",
  "mythology",
] as const;

export type SceneBreakDesign = (typeof SCENE_BREAK_DESIGNS)[number];

// Keys are lower-case letters only, so "Sci-fi", "sci fi" and "SciFi" match.
// The ten genres in lib/genres.ts, plus spellings older series may carry and
// genres the app may add later.
const GENRE_DESIGNS: Record<string, SceneBreakDesign> = {
  fantasy: "fantasy",
  scifi: "scifi",
  sciencefiction: "scifi",
  romance: "romance",
  mystery: "mystery",
  horror: "horror",
  thriller: "thriller",
  historical: "historical",
  historicalfiction: "historical",
  comedy: "comedy",
  sliceoflife: "comedy",
  drama: "drama",
  literary: "literary",
  literaryfiction: "literary",
  youngadult: "youngAdult",
  ya: "youngAdult",
  dystopian: "dystopian",
  urbanfantasy: "urbanFantasy",
  paranormal: "urbanFantasy",
  mythology: "mythology",
  adventure: "mythology",
};

// Sub tags (lib/series-tags.ts) that have a design of their own.
const TAG_DESIGNS: Record<string, SceneBreakDesign> = {
  youngadult: "youngAdult",
  dystopian: "dystopian",
  paranormal: "urbanFantasy",
  mythology: "mythology",
  darkfantasy: "fantasy",
};

const keyOf = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

export type SceneBreakChoice = {
  design: SceneBreakDesign;
  /** Why: a sub tag, the genre, no genre set, or a genre without a design. */
  source: "tag" | "genre" | "none" | "unmapped";
};

export function sceneBreakFor(
  genre: string | null | undefined,
  tags?: readonly string[] | null,
): SceneBreakChoice {
  for (const tag of tags ?? []) {
    const design = TAG_DESIGNS[keyOf(tag)];
    if (design) return { design, source: "tag" };
  }
  const key = keyOf(genre ?? "");
  if (!key) return { design: "default", source: "none" };
  const design = GENRE_DESIGNS[key];
  return design ? { design, source: "genre" } : { design: "default", source: "unmapped" };
}

// ---- shapes -----------------------------------------------------------------

export const SCENE_BREAK_VIEWBOX = { width: 200, height: 48 } as const;

/**
 * ink: the text color. accent: the series accent (lower opacity). fade: the
 * text color fading out toward both ends. brand: the violet-to-blue brand
 * gradient, also fading at the ends. none: no paint.
 */
export type SceneBreakPaint = "ink" | "accent" | "fade" | "brand" | "none";

export type SceneBreakShape = {
  tag: "path" | "line" | "circle" | "ellipse";
  attrs: Record<string, string | number>;
  stroke?: SceneBreakPaint; // default ink
  fill?: SceneBreakPaint; // default none
  opacity?: number;
};

const MIRROR = "translate(200 0) scale(-1 1)";
const TURN = "translate(200 48) scale(-1 -1)";

const ink = (tag: SceneBreakShape["tag"], attrs: SceneBreakShape["attrs"], extra: Partial<SceneBreakShape> = {}) =>
  ({ tag, attrs, ...extra }) as SceneBreakShape;

/** The same shape and its mirror image across the center. */
const both = (shape: SceneBreakShape): SceneBreakShape[] => [
  shape,
  { ...shape, attrs: { ...shape.attrs, transform: MIRROR } },
];

/** A four-point sparkle centered on (x, y). */
function sparkle(x: number, y: number, size: number, waist = size * 0.27) {
  const r = (n: number) => Math.round(n * 100) / 100;
  return [
    `M${r(x)} ${r(y - size)}`,
    `L${r(x + waist)} ${r(y - waist)}`,
    `L${r(x + size)} ${r(y)}`,
    `L${r(x + waist)} ${r(y + waist)}`,
    `L${r(x)} ${r(y + size)}`,
    `L${r(x - waist)} ${r(y + waist)}`,
    `L${r(x - size)} ${r(y)}`,
    `L${r(x - waist)} ${r(y - waist)}`,
    "Z",
  ].join(" ");
}

// Five-point star, outer radius 7, drawn a little loose (it overshoots its start).
const DOODLE_STAR =
  "M0 -7 L1.9 -2.3 L6.8 -2.4 L2.9 0.9 L4.3 5.8 L0.1 3.1 L-4.2 5.6 L-2.8 0.8 L-6.6 -2.0 L-1.6 -2.5 L0.5 -7.6";

const BARCODE_HEIGHTS = [8, 5, 8, 6, 10, 5, 7, 8, 5, 9, 6, 8, 10, 6, 5, 0, 7, 9, 5, 8, 6, 10, 7, 5, 8];

const DESIGNS: Record<SceneBreakDesign, SceneBreakShape[]> = {
  // A short gradient line with a small dot in the center.
  default: [
    ink("path", { d: "M44 24 H91 M109 24 H156", "stroke-width": 1.4 }, { stroke: "brand" }),
    ink("circle", { cx: 100, cy: 24, r: 2.4 }, { stroke: "none", fill: "accent" }),
  ],

  // A fine vine with curled ends, two small leaves, a diamond in the center.
  fantasy: [
    ...both(ink("path", { d: "M91 24 C82 18 74 30 64 24 S48 18 40 24 C36 27 31 25 32 21.5 C33 18.5 37.5 19.5 36.5 22.5" })),
    ...both(ink("path", { d: "M70 26.5 C68 30.5 64 31 62 30 C64 28 67 26.8 70 26.5 Z" }, { fill: "accent", stroke: "none", opacity: 0.7 })),
    ...both(ink("path", { d: "M52 21 C51 17.5 48 16.5 46 17 C47.5 19.2 49.5 20.5 52 21 Z" }, { fill: "accent", stroke: "none", opacity: 0.7 })),
    ink("path", { d: "M100 17.5 L106.5 24 L100 30.5 L93.5 24 Z" }, { stroke: "accent" }),
    ink("circle", { cx: 100, cy: 24, r: 1.3 }, { stroke: "none", fill: "ink" }),
  ],

  // A thin signal line with tick marks; a ring and orbit in the center.
  scifi: [
    ...both(ink("path", { d: "M32 24 H86 M40 21.5 V26.5 M48 22.5 V25.5 M56 20 V28 M64 22.5 V25.5 M72 21.5 V26.5" }, { stroke: "fade" })),
    ink("circle", { cx: 100, cy: 24, r: 4 }, { stroke: "accent" }),
    ink("ellipse", { cx: 100, cy: 24, rx: 12, ry: 4.2, transform: "rotate(-18 100 24)" }),
    ink("circle", { cx: 111, cy: 20.2, r: 1.5 }, { stroke: "none", fill: "accent" }),
  ],

  // Two soft curves fading at the outer ends, a small heart in the center.
  romance: [
    ...both(ink("path", { d: "M30 27 C50 18 72 18 89 24" }, { stroke: "fade" })),
    ink(
      "path",
      { d: "M100 30 C93 25 92.5 19.5 96.3 18.3 C98.2 17.7 99.5 18.9 100 20.4 C100.5 18.9 101.8 17.7 103.7 18.3 C107.5 19.5 107 25 100 30 Z" },
      { stroke: "none", fill: "accent" },
    ),
  ],

  // A dotted line with a keyhole in the center.
  mystery: [
    ...both(ink("path", { d: "M34 24 H88", "stroke-dasharray": "0.1 5", "stroke-width": 1.8 }, { stroke: "fade" })),
    ink("circle", { cx: 100, cy: 24, r: 8 }),
    ink("circle", { cx: 100, cy: 22, r: 2.4 }, { stroke: "none", fill: "accent" }),
    ink("path", { d: "M99 23.5 L97.8 29 H102.2 L101 23.5 Z" }, { stroke: "none", fill: "accent" }),
  ],

  // A hairline crack that splits and branches, with a gap in the middle.
  horror: [
    ink("path", { d: "M32 24 L46 23 L55 25.5 L64 22 L74 25 L83 23 L92 24 M55 25.5 L58 30 L61 31.5 M64 22 L66.5 17.5 M74 25 L76 29", "stroke-width": 1, "stroke-linejoin": "miter" }),
    ink("path", { d: "M32 24 L46 23 L55 25.5 L64 22 L74 25 L83 23 L92 24 M55 25.5 L58 30 L61 31.5 M64 22 L66.5 17.5 M74 25 L76 29", "stroke-width": 1, "stroke-linejoin": "miter", transform: TURN }),
    ink("path", { d: "M58 30 L61 31.5 M66.5 17.5 L67 15.5 M138 18 L139 16" }, { stroke: "accent", opacity: 0.8 }),
  ],

  // A line cut by three short slashes: a countdown cut.
  thriller: [
    ...both(ink("path", { d: "M34 24 H86" }, { stroke: "fade" })),
    ink("path", { d: "M89 30 L95 18 M97 30 L103 18 M105 30 L111 18", "stroke-width": 1.6 }, { stroke: "accent" }),
  ],

  // A printer's fleuron between thin double rules.
  historical: [
    ...both(ink("path", { d: "M36 22 H82 M36 26 H82", "stroke-width": 0.9 }, { stroke: "fade" })),
    ...both(ink("path", { d: "M87 24 C89 19 94 18.5 95 22 C95.6 24.4 93 25.6 91.8 23.8" })),
    ink("path", { d: "M100 15.5 C104.5 19.5 104.5 28.5 100 32.5 C95.5 28.5 95.5 19.5 100 15.5 Z" }, { stroke: "none", fill: "accent" }),
    ink("path", { d: "M100 19 V29", "stroke-width": 0.8 }),
  ],

  // A loose wavy line with three small dots: playful and light.
  comedy: [
    ...both(ink("path", { d: "M30 24 Q36 18.5 42 24 T54 24 T66 24 T78 24" })),
    ink("circle", { cx: 90, cy: 24, r: 1.7 }, { stroke: "none", fill: "ink" }),
    ink("circle", { cx: 100, cy: 22.5, r: 2 }, { stroke: "none", fill: "accent" }),
    ink("circle", { cx: 110, cy: 24, r: 1.7 }, { stroke: "none", fill: "ink" }),
  ],

  // Two curtain swags meeting at a spotlight dot with a faint halo.
  drama: [
    ...both(ink("path", { d: "M36 17 Q62 35 91 22 M36 17 V23 M36 17 Q52 27 66 26.4" })),
    ink("circle", { cx: 100, cy: 23, r: 6.5 }, { stroke: "none", fill: "accent", opacity: 0.18 }),
    ink("circle", { cx: 100, cy: 23, r: 2.4 }, { stroke: "none", fill: "accent" }),
  ],

  // One calligraphic pen stroke (thick and thin) ending in an ink drop.
  literary: [
    ink("path", { d: "M38 25.5 C62 20 104 20 148 22.6 C108 22.7 68 24 38 25.5 Z" }, { stroke: "none", fill: "ink" }),
    ink("path", { d: "M160 18.5 C162.3 22 163.4 24.5 161.8 26.4 C160.3 28 157.7 27.3 157.7 25.2 C157.7 23.5 159.2 21.5 160 18.5 Z" }, { stroke: "none", fill: "accent" }),
  ],

  // A doodled star, a dot and another star, a little uneven, as if hand-drawn.
  youngAdult: [
    ink("path", { d: DOODLE_STAR, transform: "translate(78 24.5) rotate(-9)" }),
    ink("circle", { cx: 100, cy: 23.5, r: 2.1 }, { stroke: "none", fill: "accent" }),
    ink("path", { d: DOODLE_STAR, transform: "translate(122 23.5) rotate(14) scale(0.88)" }),
  ],

  // A row of thin barcode bars with one bar missing.
  dystopian: BARCODE_HEIGHTS.flatMap((height, index): SceneBreakShape[] => {
    if (!height) return [];
    const x = 52 + index * 4;
    return [
      ink(
        "line",
        { x1: x, y1: 24 - height, x2: x, y2: 24 + height, "stroke-width": index % 3 === 0 ? 1.8 : 1, "stroke-linecap": "butt" },
        index === 16 ? { stroke: "accent" } : {},
      ),
    ];
  }),

  // A crescent moon with three small stars along a faint line.
  urbanFantasy: [
    ink("path", { d: "M32 24 H168" }, { stroke: "fade", opacity: 0.45 }),
    ink("path", { d: "M102 16 A8 8 0 1 0 102 32 A9.5 9.5 0 0 1 102 16 Z" }, { stroke: "none", fill: "accent" }),
    ink("path", { d: sparkle(70, 24, 3) }, { stroke: "none", fill: "ink" }),
    ink("path", { d: sparkle(130, 24, 3) }, { stroke: "none", fill: "ink" }),
    ink("path", { d: sparkle(146, 21, 2) }, { stroke: "none", fill: "ink" }),
  ],

  // A small compass rose on a wave-like line.
  mythology: [
    ...both(ink("path", { d: "M32 24 C37 19 42 19 47 24 S57 29 62 24 S72 19 77 24 S84 27 87 24" }, { stroke: "fade" })),
    ink("path", { d: sparkle(100, 24, 10, 2.2) }),
    ink("path", { d: sparkle(100, 24, 5.5, 1.4), transform: "rotate(45 100 24)" }, { stroke: "none", fill: "accent", opacity: 0.8 }),
    ink("circle", { cx: 100, cy: 24, r: 1.2 }, { stroke: "none", fill: "ink" }),
  ],
};

export function sceneBreakShapes(design: SceneBreakDesign): SceneBreakShape[] {
  return DESIGNS[design] ?? DESIGNS.default;
}

/** Gradients a design needs (each drawn once per break, ids prefixed per break). */
export function sceneBreakGradients(design: SceneBreakDesign): Array<"fade" | "brand"> {
  const used = new Set<"fade" | "brand">();
  for (const shape of sceneBreakShapes(design)) {
    for (const paint of [shape.stroke, shape.fill]) if (paint === "fade" || paint === "brand") used.add(paint);
  }
  return [...used];
}

/** The CSS paint value for a shape's stroke or fill (set as style: SVG attributes can't hold var()). */
export function sceneBreakPaint(paint: SceneBreakPaint | undefined, fallback: "ink" | "none", uid: string) {
  const value = paint ?? fallback;
  if (value === "none") return "none";
  if (value === "ink") return "currentColor";
  if (value === "accent") return "var(--sb-accent)";
  return `url(#${uid}-${value})`;
}

/**
 * The whole break as a small element tree (kebab-case attribute and style
 * names), so the React reader and the editor's plain-DOM view draw exactly
 * the same SVG. `uid` must be unique on the page (gradient ids).
 */
export type SvgNode = {
  tag: string;
  attrs: Record<string, string | number>;
  style?: Record<string, string | number>;
  children?: SvgNode[];
};

export function sceneBreakSvg(design: SceneBreakDesign, uid: string): SvgNode {
  const stop = (offset: number, color: string, opacity: number): SvgNode => ({
    tag: "stop",
    attrs: { offset },
    style: { "stop-color": color, "stop-opacity": opacity },
  });
  const gradients: SvgNode[] = sceneBreakGradients(design).map((kind) =>
    kind === "fade"
      ? {
          tag: "linearGradient",
          attrs: { id: `${uid}-fade`, gradientUnits: "userSpaceOnUse", x1: 30, y1: 0, x2: 170, y2: 0 },
          children: [stop(0, "currentColor", 0), stop(0.3, "currentColor", 1), stop(0.7, "currentColor", 1), stop(1, "currentColor", 0)],
        }
      : {
          tag: "linearGradient",
          attrs: { id: `${uid}-brand`, gradientUnits: "userSpaceOnUse", x1: 44, y1: 0, x2: 156, y2: 0 },
          children: [
            stop(0, "var(--sb-brand-a)", 0),
            stop(0.22, "var(--sb-brand-a)", 1),
            stop(0.78, "var(--sb-brand-b)", 1),
            stop(1, "var(--sb-brand-b)", 0),
          ],
        },
  );

  const shapes: SvgNode[] = sceneBreakShapes(design).map((shape) => ({
    tag: shape.tag,
    attrs: shape.attrs,
    style: {
      stroke: sceneBreakPaint(shape.stroke, "ink", uid),
      fill: sceneBreakPaint(shape.fill, "none", uid),
      ...(shape.opacity === undefined ? {} : { opacity: shape.opacity }),
    },
  }));

  return {
    tag: "svg",
    attrs: {
      class: "scene-break-art",
      viewBox: `0 0 ${SCENE_BREAK_VIEWBOX.width} ${SCENE_BREAK_VIEWBOX.height}`,
      width: SCENE_BREAK_VIEWBOX.width,
      height: SCENE_BREAK_VIEWBOX.height,
      "aria-hidden": "true",
      focusable: "false",
      "stroke-width": 1.2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    children: [...(gradients.length ? [{ tag: "defs", attrs: {}, children: gradients }] : []), ...shapes],
  };
}

/** Editor-only explanation when the default break is shown for a reason the writer can change. */
export function sceneBreakNote(choice: SceneBreakChoice, genre: string | null | undefined) {
  if (choice.source === "none") return "Default scene break: this series has no genre yet. Set one in series details.";
  if (choice.source === "unmapped") return `Default scene break: there's no design for “${(genre ?? "").trim()}” yet.`;
  return null;
}
