"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { aiTagBannerModel } from "@/lib/ai-tag-banner";

/*
 * The single way an AI usage tag is shown. A mini banner that hangs from the
 * bottom edge of whatever it labels (place it directly after that element) and
 * drops open when it first appears. Its look lives in lib/ai-tag-banner.config.ts.
 * Renders nothing for a missing tag.
 */

let observer: IntersectionObserver | null = null;
const pending = new WeakMap<Element, boolean>();

/** One shared observer: replays the unfurl when a banner below the fold scrolls in. */
function watch(element: HTMLElement) {
  if (typeof IntersectionObserver === "undefined") return () => {};
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          pending.set(entry.target, true);
          continue;
        }
        // Replay only if it was off-screen when the page loaded; on-screen ones
        // already unfurled from the server-rendered CSS animation.
        if (pending.has(entry.target)) {
          const parts = [entry.target, entry.target.firstElementChild].filter(Boolean) as HTMLElement[];
          parts.forEach((el) => (el.style.animation = "none"));
          void (entry.target as HTMLElement).offsetWidth;
          parts.forEach((el) => (el.style.animation = ""));
        }
        pending.delete(entry.target);
        observer?.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -24px 0px" },
  );
  observer.observe(element);
  return () => {
    pending.delete(element);
    observer?.unobserve(element);
  };
}

export default function AiTagBanner({
  tag,
  className = "",
}: {
  tag?: string | null;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const model = aiTagBannerModel(tag);
  const replay = Boolean(model?.replayOnScroll);

  useEffect(() => {
    const element = ref.current;
    if (!element || !replay) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return watch(element);
  }, [replay]);

  if (!model) return null;

  return (
    <span
      ref={ref}
      role="note"
      aria-label={model.accessibleName}
      title={model.description}
      data-ai-tag={model.tag}
      data-animate={model.animate ? "true" : "false"}
      className={`ai-banner ${className}`.trim()}
      style={model.style as CSSProperties}
    >
      <span className="ai-banner__label">{model.label}</span>
    </span>
  );
}
