"use client";

import { useEffect, useState } from "react";

export function useIsMobile(query = "(max-width: 767px)") {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** Height of the on-screen keyboard (0 when closed), so mobile bars can sit above it. */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () =>
      setInset(Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop)));
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}

/** "⌘" on Apple devices, "Ctrl" elsewhere (decided after mount to avoid hydration mismatch). */
export function useModifierLabel() {
  const [label, setLabel] = useState("Ctrl");
  useEffect(() => {
    if (/Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)) setLabel("⌘");
  }, []);
  return label;
}
