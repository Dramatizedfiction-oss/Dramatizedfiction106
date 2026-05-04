"use client";

import { AI_USAGE_OPTIONS, aiUsageDescription, type AiUsageTag } from "@/lib/ai-usage";

export default function AiUsageSelector({
  value,
  onChange,
  label = "AI usage tag",
}: {
  value: AiUsageTag;
  onChange: (value: AiUsageTag) => void;
  label?: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="theme-heading text-sm font-semibold">{label}</p>
        <p className="theme-meta mt-1 text-sm">
          Choose the transparency label readers will see publicly.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {AI_USAGE_OPTIONS.map((option) => {
          const active = option === value;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`rounded-[20px] border px-4 py-4 text-left transition ${
                active
                  ? "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                  : "border-[var(--border-color)] text-[var(--text-secondary)] hover:opacity-80"
              }`}
            >
              <p className="theme-heading text-sm font-semibold">{option}</p>
              <p className="theme-meta mt-2 text-xs leading-5">
                {aiUsageDescription(option)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
