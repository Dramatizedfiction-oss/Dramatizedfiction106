import type { ContentAccessStatus } from "@/lib/monetization";

export default function ContentAccessBadge({
  accessStatus,
}: {
  accessStatus: ContentAccessStatus;
}) {
  if (accessStatus === "free") {
    return null;
  }

  const labels: Record<Exclude<ContentAccessStatus, "free">, string> = {
    locked: "Locked",
    owned: "Owned",
    subscribed: "Dramatiz+ Active",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${
        accessStatus === "locked"
          ? "border-[var(--border-color)] bg-transparent text-[var(--text-primary)]"
          : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
      }`}
    >
      {labels[accessStatus]}
    </span>
  );
}
