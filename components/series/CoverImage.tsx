"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/*
 * An image that tries each source in order (e.g. the cover's 480px small copy,
 * then the full cover) and shows `fallback` when none loads. Plain <img>:
 * images come straight from storage, so no Vercel image transformations are
 * used. Lazy by default; pass `eager` for the hero.
 */
export default function CoverImage({
  sources,
  alt = "",
  eager = false,
  className = "",
  fallback,
}: {
  sources: (string | null | undefined)[];
  alt?: string;
  eager?: boolean;
  className?: string;
  fallback: ReactNode;
}) {
  const list = sources.filter((source): source is string => Boolean(source));
  const key = list.join("|");
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => setIndex(0), [key]);
  // An image that failed before hydration never fires onError: check once mounted.
  useEffect(() => {
    const image = ref.current;
    if (image?.complete && image.naturalWidth === 0) setIndex((value) => value + 1);
  }, [index, key]);

  const src = list[index];
  if (!src) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setIndex((value) => value + 1)}
      className={className}
    />
  );
}
