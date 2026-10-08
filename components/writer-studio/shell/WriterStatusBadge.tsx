import { writerStatusLabel } from "@/lib/writer-studio/status";

/** The stored User.writerStatus (BEGINNER / FULL / FEATURED / ELITE). */
export default function WriterStatusBadge({ status }: { status: string | null | undefined }) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-[var(--studio-border)] px-3 py-1 font-mono-df text-[10px] uppercase tracking-[0.2em] text-[var(--studio-text)]"
      title="Your writer status on Dramatized Fiction"
    >
      {writerStatusLabel(status)}
    </span>
  );
}
