"use client";

import { useId } from "react";
import UserAvatar, { AVATAR_SIZES, type UserAvatarSize } from "@/components/UserAvatar";
import type { AvatarUser } from "@/lib/avatars";
import { frameFor, type FrameTier } from "@/lib/writer-frames";

/*
 * A profile picture with the writer's level frame around it (lib/writer-frames.ts).
 * Readers, or `frame={false}`, get the plain circle. The frame is inline SVG
 * drawn outside the photo, which is inset so the frame never covers the face.
 * Small sizes (under 48px) get a plain ring in the tier color instead of the
 * full design. Colors are theme tokens (--frame-*, app/globals.css) chosen for
 * at least 3:1 contrast on both themes; the Laureate shimmer stops under
 * reduced motion. The level is also given as text for screen readers.
 */

const DECORATED: UserAvatarSize[] = ["lg", "xl", "2xl"];

export default function FramedAvatar({
  user,
  size = "md",
  label,
  eager,
  frame = true,
  className = "",
}: {
  user: AvatarUser & { writerStatus?: string | null };
  size?: UserAvatarSize;
  label?: string;
  eager?: boolean;
  frame?: boolean;
  className?: string;
}) {
  const found = frame ? frameFor(user) : null;
  if (!found) return <UserAvatar user={user} size={size} label={label} eager={eager} className={className} />;

  const decorated = DECORATED.includes(size);
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${AVATAR_SIZES[size]} ${className}`.trim()}
      title={found.label}
      data-frame={found.tier}
    >
      <UserAvatar
        user={user}
        size={size}
        label={label}
        eager={eager}
        className={decorated ? "!h-[80%] !w-[80%] !border-0" : "!h-[84%] !w-[84%] !border-0"}
      />
      {decorated ? <FrameArt tier={found.tier} /> : <RingArt tier={found.tier} />}
      <span className="sr-only">{found.label}</span>
    </span>
  );
}

const TIER_COLOR: Record<FrameTier, string> = {
  ink: "var(--frame-ink)",
  quill: "var(--frame-bronze)",
  gilded: "var(--frame-gold)",
  laureate: "var(--frame-gold)",
};

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      {children}
    </svg>
  );
}

/** Small sizes: one ring in the tier color (Laureate keeps its gradient). */
function RingArt({ tier }: { tier: FrameTier }) {
  const id = useId().replace(/:/g, "");
  return (
    <Svg>
      {tier === "laureate" ? <BrandGradient id={id} /> : null}
      <circle cx="50" cy="50" r="46" fill="none" stroke={tier === "laureate" ? `url(#${id})` : TIER_COLOR[tier]} strokeWidth="7" />
    </Svg>
  );
}

function BrandGradient({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" style={{ stopColor: "var(--frame-gold)" }} />
        <stop offset="0.45" stopColor="#7c3aed" />
        <stop offset="1" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
  );
}

/** Leaves along the ring between two angles (degrees; 90 = bottom, SVG y points down). */
function Leaves({ from, to, step, radius, fill }: { from: number; to: number; step: number; radius: number; fill: string }) {
  const leaves: JSX.Element[] = [];
  const direction = to >= from ? 1 : -1;
  for (let angle = from; direction > 0 ? angle <= to : angle >= to; angle += step * direction) {
    const rad = (angle * Math.PI) / 180;
    const x = 50 + radius * Math.cos(rad);
    const y = 50 + radius * Math.sin(rad);
    // Along the ring, tilted outward like a laurel leaf.
    const rotation = angle + 90 + 28 * direction;
    leaves.push(<ellipse key={angle} cx={x.toFixed(2)} cy={y.toFixed(2)} rx="3.4" ry="1.5" transform={`rotate(${rotation.toFixed(1)} ${x.toFixed(2)} ${y.toFixed(2)})`} fill={fill} />);
  }
  return <>{leaves}</>;
}

function FrameArt({ tier }: { tier: FrameTier }) {
  const id = useId().replace(/:/g, "");

  if (tier === "ink") {
    return (
      <Svg>
        <circle cx="50" cy="50" r="44.5" fill="none" stroke="var(--frame-ink)" strokeWidth="1.6" />
      </Svg>
    );
  }

  if (tier === "quill") {
    return (
      <Svg>
        <circle cx="50" cy="50" r="43.5" fill="none" stroke="var(--frame-bronze)" strokeWidth="1.4" />
        <circle cx="50" cy="50" r="47" fill="none" stroke="var(--frame-bronze)" strokeWidth="2.2" />
        {/* Quill notch at the top: a small feather across the rings. */}
        <path d="M50 -1.5 C54.2 2.5 54.2 7.5 50 11 C45.8 7.5 45.8 2.5 50 -1.5Z" fill="var(--frame-bronze)" stroke="var(--frame-backdrop)" strokeWidth="1.1" />
        <path d="M50 0.5 L50 10" stroke="var(--frame-backdrop)" strokeWidth="0.8" />
      </Svg>
    );
  }

  if (tier === "gilded") {
    return (
      <Svg>
        <defs>
          <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--frame-gold-light)" }} />
            <stop offset="0.5" style={{ stopColor: "var(--frame-gold)" }} />
            <stop offset="1" style={{ stopColor: "var(--frame-gold-deep)" }} />
          </linearGradient>
        </defs>
        {/* Twisted rope: a solid band with a dashed twist over it. */}
        <circle cx="50" cy="50" r="45.5" fill="none" stroke={`url(#${id}-sheen)`} strokeWidth="4" />
        <circle cx="50" cy="50" r="45.5" fill="none" stroke="var(--frame-gold-deep)" strokeWidth="4" strokeDasharray="1.6 3" opacity="0.55" />
        {/* Laurel sprig at the bottom. */}
        <Leaves from={74} to={58} step={8} radius={49.5} fill="var(--frame-gold)" />
        <Leaves from={106} to={122} step={8} radius={49.5} fill="var(--frame-gold)" />
        <circle cx="50" cy="99" r="1.8" fill="var(--frame-gold)" />
      </Svg>
    );
  }

  // Laureate: gold into the brand gradient, full wreath, star crest, shimmer.
  return (
    <Svg>
      <BrandGradient id={id} />
      <defs>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill="none" stroke={`url(#${id})`} strokeWidth="3.4" />
      <g className="frame-shimmer">
        <circle cx="50" cy="50" r="45" fill="none" stroke={`url(#${id}-shine)`} strokeWidth="3.4" strokeDasharray="22 260" />
      </g>
      {/* Full wreath up both sides, open at the top for the crest. */}
      <Leaves from={96} to={238} step={11} radius={49.5} fill="var(--frame-gold)" />
      <Leaves from={84} to={-58} step={11} radius={49.5} fill="var(--frame-gold)" />
      {/* Star crest. */}
      <path
        d="M50 -4.5 L52.2 0.6 L57.6 1 L53.4 4.4 L54.8 9.6 L50 6.7 L45.2 9.6 L46.6 4.4 L42.4 1 L47.8 0.6 Z"
        fill="var(--frame-gold)"
        stroke="var(--frame-backdrop)"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
