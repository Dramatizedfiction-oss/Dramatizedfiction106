import { placeholderGradient } from "@/lib/series-accent";

/**
 * The generated picture for an episode (or series) without an image: a series
 * color gradient with the number and title in the story typeface. Built in
 * code and deterministic, so no image file is stored or downloaded.
 */
export default function PlaceholderArt({
  themeColor,
  number,
  kicker,
  title,
  size = "card",
}: {
  themeColor: string | null;
  number: number;
  kicker?: string;
  title: string;
  size?: "card" | "hero" | "rail";
}) {
  const big = size === "hero";
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex flex-col justify-end overflow-hidden p-4 text-white"
      style={{ background: placeholderGradient(themeColor, number) }}
    >
      <span
        className={`pointer-events-none absolute -right-2 -top-6 font-heading font-semibold leading-none text-white/15 ${
          big ? "text-[12rem]" : size === "rail" ? "text-[6rem]" : "text-[7rem]"
        }`}
      >
        {number}
      </span>
      {/* A scrim keeps the white text readable whatever the series color. */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/70 to-transparent" />
      {kicker ? <span className="relative font-mono-df text-[10px] uppercase tracking-[0.2em] text-white/80">{kicker}</span> : null}
      <span
        className={`relative mt-1 line-clamp-3 font-heading font-semibold leading-tight [text-shadow:0_1px_8px_rgb(0_0_0/0.35)] ${
          big ? "text-4xl" : size === "rail" ? "text-base" : "text-lg"
        }`}
      >
        {title}
      </span>
    </div>
  );
}
