import type { AuthorVisibilityTier } from "@/lib/author-tier";

export default function AuthorTierBadge({
  tier,
  compact = false,
}: {
  tier: AuthorVisibilityTier;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--text-secondary)] ${
        compact ? "" : "gap-2"
      }`}
    >
      {tier}
    </span>
  );
}
