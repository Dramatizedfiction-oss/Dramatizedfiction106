import type { Availability } from "@/lib/grow/content";

const LABELS: Record<Availability, string> = {
  now: "Available now",
  later: "Coming later",
  phase2: "Needs Phase 2",
  phase3: "Needs Phase 3",
};

export default function AvailabilityTag({ availability }: { availability: Availability }) {
  const live = availability === "now";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono-df text-[10px] uppercase tracking-[0.16em] ${
        live
          ? "border-[var(--status-live)] text-[var(--status-live)]"
          : "border-dashed border-[var(--studio-border)] text-[var(--studio-muted)]"
      }`}
    >
      {live ? <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--status-live)]" /> : null}
      {LABELS[availability]}
    </span>
  );
}
