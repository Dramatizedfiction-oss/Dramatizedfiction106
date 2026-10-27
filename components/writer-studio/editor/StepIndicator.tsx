"use client";

export type EditorStep = "write" | "publish";

/** "1 Write · 2 Publish": both steps can be tapped; the current one is marked. */
export default function StepIndicator({
  step,
  live,
  onStepChange,
}: {
  step: EditorStep;
  live: boolean;
  onStepChange: (step: EditorStep) => void;
}) {
  const steps: Array<{ id: EditorStep; label: string }> = [
    { id: "write", label: "Write" },
    { id: "publish", label: live ? "Details" : "Publish" },
  ];

  return (
    <nav aria-label="Episode steps" className="border-t border-[var(--studio-border)]">
      <ol className="mx-auto flex h-11 max-w-[760px] items-center justify-center gap-2 px-4">
        {steps.map((item, index) => {
          const current = item.id === step;
          return (
            <li key={item.id} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden className="h-px w-6 bg-[var(--studio-border)] sm:w-10" /> : null}
              <button
                type="button"
                onClick={() => onStepChange(item.id)}
                aria-current={current ? "step" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm transition ${
                  current ? "font-semibold text-[var(--studio-text)]" : "text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                    current
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                      : "border-[var(--studio-border)]"
                  }`}
                >
                  {index + 1}
                </span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
