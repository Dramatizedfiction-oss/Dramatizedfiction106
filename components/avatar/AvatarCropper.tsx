"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  AVATAR_MAX_ZOOM,
  AVATAR_MIN_ZOOM,
  CENTERED_CROP,
  clampCrop,
  cropLayout,
  dragCrop,
  zoomCrop,
  type AvatarCrop,
} from "@/lib/avatar-crop";

/*
 * Position a photo inside the avatar circle: drag to move (touch, pen or
 * mouse), pinch / slider / wheel / +- keys to zoom, arrow keys to nudge.
 * The geometry lives in lib/avatar-crop.ts, which keeps the photo covering
 * the whole circle; the server applies the same rules again on save.
 */

const CIRCLE_VIEWPORT = 272;
/** Book covers (Sweep 14): a 2:3 frame, 200 x 300 on screen. */
const PORTRAIT_VIEWPORT = 200;
const PORTRAIT_ASPECT = 2 / 3;
const PREVIEWS = [
  { size: 80, label: "Profile" },
  { size: 40, label: "Comments" },
  { size: 24, label: "Lists" },
];

export default function AvatarCropper({
  src,
  initial,
  busy,
  error,
  onSave,
  onCancel,
  frame = "circle",
}: {
  /** "circle" for avatars (default); "portrait" for 2:3 book covers. */
  frame?: "circle" | "portrait";
  src: string;
  initial: AvatarCrop | null;
  busy: boolean;
  error: string | null;
  onSave: (crop: AvatarCrop) => void;
  onCancel: () => void;
}) {
  const portrait = frame === "portrait";
  const VIEWPORT = portrait ? PORTRAIT_VIEWPORT : CIRCLE_VIEWPORT;
  const aspect = portrait ? PORTRAIT_ASPECT : 1;
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState<AvatarCrop>(initial ?? CENTERED_CROP);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  useEffect(() => {
    let alive = true;
    const image = new Image();
    image.onload = () => {
      if (!alive) return;
      setNatural({ width: image.naturalWidth, height: image.naturalHeight });
      setCrop((current) => clampCrop(current, image.naturalWidth, image.naturalHeight, aspect));
    };
    image.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  const ready = Boolean(natural);
  const width = natural?.width ?? 1;
  const height = natural?.height ?? 1;

  function setZoom(zoom: number) {
    setCrop((current) => zoomCrop(current, zoom, width, height, aspect));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!ready) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: crop.zoom };
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom(pinch.current.zoom * (distance / Math.max(1, pinch.current.distance)));
      return;
    }
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    setCrop((current) => dragCrop(current, dx, dy, width, height, VIEWPORT, aspect));
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  // A native, non-passive listener so wheel-zooming doesn't also scroll the page.
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = viewportRef.current;
    if (!element || !natural) return;
    function onWheel(event: globalThis.WheelEvent) {
      event.preventDefault();
      setCrop((current) => zoomCrop(current, current.zoom * Math.exp(-event.deltaY * 0.0015), natural!.width, natural!.height, aspect));
    }
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [natural]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 24 : 8;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (moves[event.key]) {
      event.preventDefault();
      const [dx, dy] = moves[event.key];
      setCrop((current) => dragCrop(current, dx, dy, width, height, VIEWPORT, aspect));
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom(crop.zoom + 0.1);
    } else if (event.key === "-") {
      event.preventDefault();
      setZoom(crop.zoom - 0.1);
    }
  }

  const layout = cropLayout(crop, width, height, VIEWPORT, aspect);

  return (
    <div className="flex flex-col items-center">
      <p className="theme-meta text-center text-sm">Drag to move. Pinch, scroll or use the slider to zoom.</p>

      <div
        role="application"
        aria-label="Photo position. Use the arrow keys to move, plus and minus to zoom."
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        ref={viewportRef}
        className={`relative mt-4 cursor-grab touch-none select-none overflow-hidden ${portrait ? "rounded-xl" : "rounded-[28px]"} bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))] active:cursor-grabbing`}
        style={{ width: VIEWPORT, height: VIEWPORT / aspect }}
      >
        {ready ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{ width: layout.width, height: layout.height, left: layout.left, top: layout.top }}
          />
        ) : (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Loading photo…</p>
        )}
        {/* The circle: everything outside it is dimmed. (A portrait frame is the whole viewport.) */}
        {portrait ? (
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-inset ring-white/90" />
        ) : (
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] ring-2 ring-white/90" />
        )}
      </div>

      <label className="mt-5 flex w-full max-w-[320px] items-center gap-3">
        <span className="theme-meta text-xs">Zoom</span>
        <input
          type="range"
          min={AVATAR_MIN_ZOOM}
          max={AVATAR_MAX_ZOOM}
          step={0.01}
          value={crop.zoom}
          disabled={!ready}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="h-11 flex-1 accent-[var(--accent-solid)]"
          aria-valuetext={`${Math.round(crop.zoom * 100)} percent`}
        />
      </label>

      {portrait ? null : (
      <div className="mt-4 flex items-end gap-5" aria-label="Preview">
        {PREVIEWS.map((preview) => {
          const small = cropLayout(crop, width, height, preview.size);
          return (
            <div key={preview.size} className="flex flex-col items-center gap-1.5">
              <span
                className="relative block overflow-hidden rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)]"
                style={{ width: preview.size, height: preview.size }}
              >
                {ready ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="absolute max-w-none" style={{ width: small.width, height: small.height, left: small.left, top: small.top }} />
                ) : null}
              </span>
              <span className="theme-meta text-[10px] uppercase tracking-[0.16em]">{preview.label}</span>
            </div>
          );
        })}
      </div>
      )}

      {error ? (
        <p role="alert" className="mt-4 text-center text-sm text-[var(--status-danger)]">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid w-full max-w-[360px] grid-cols-3 gap-2">
        <button type="button" onClick={() => setCrop(clampCrop(CENTERED_CROP, width, height, aspect))} disabled={!ready || busy} className="story-button-secondary min-h-11 justify-center disabled:opacity-50">
          Reset
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="story-button-secondary min-h-11 justify-center disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={() => onSave(crop)} disabled={!ready || busy} className="story-button-primary min-h-11 justify-center disabled:opacity-50">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
