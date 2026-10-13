"use client";

import { useEffect, useRef, useState } from "react";

/** Text clamped to a few lines, with "More" / "Less" only when it overflows. */
export default function ExpandableText({ text, lines = 4, className = "" }: { text: string; lines?: number; className?: string }) {
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const check = () => setOverflows(element.scrollHeight > element.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div className={className}>
      <p
        ref={ref}
        className="whitespace-pre-line break-words"
        style={open ? undefined : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {text}
      </p>
      {overflows || open ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--text-primary)] underline decoration-1 underline-offset-4 hover:decoration-2"
        >
          {open ? "Less" : "More"}
        </button>
      ) : null}
    </div>
  );
}
