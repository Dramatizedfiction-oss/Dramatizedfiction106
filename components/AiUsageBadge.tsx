import { aiUsageDescription, deserializeAiUsageTag, type AiUsageTag } from "@/lib/ai-usage";

export default function AiUsageBadge({
  tag,
  compact = false,
}: {
  tag?: string | null;
  compact?: boolean;
}) {
  const normalized = deserializeAiUsageTag(tag);

  return (
    <span
      className={`inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--text-secondary)] ${
        compact ? "" : "gap-2"
      }`}
      title={aiUsageDescription(normalized as AiUsageTag)}
    >
      <span>AI</span>
      <span>{normalized.replace("AI ", "")}</span>
    </span>
  );
}
