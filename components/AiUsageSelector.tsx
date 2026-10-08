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

      <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-2">
        {AI_USAGE_OPTIONS.map((option) => {
          const active = option === value;

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option)}
              className="ui-choice rounded-[20px] px-4 py-4 text-left"
            >
              <p className={`text-sm font-semibold ${active ? "text-[var(--accent)]" : "theme-heading"}`}>{option}</p>
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
