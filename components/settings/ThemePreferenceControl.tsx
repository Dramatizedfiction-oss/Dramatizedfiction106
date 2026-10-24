"use client";

import { MoonIcon, SettingsIcon, SunIcon } from "@/components/icons";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; description: string; Icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", description: "Bright and clean.", Icon: SunIcon },
  { value: "dark", label: "Dark", description: "Cinematic, for night reading. The default.", Icon: MoonIcon },
  { value: "system", label: "System", description: "Follow your device's setting.", Icon: SettingsIcon },
];

/* The theme choice (Sweep E): three radio rows in one group, a check on the chosen one. */
export default function ThemePreferenceControl() {
  const { preference, resolvedTheme, setPreference } = useTheme();

  return (
    <div>
      <div role="radiogroup" aria-label="Theme" className="surface-group">
        {OPTIONS.map(({ value, label, description, Icon }) => {
          const selected = preference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${label} theme`}
              onClick={() => setPreference(value)}
              className="surface-row w-full text-left"
            >
              <span className="surface-row-icon" aria-hidden>
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[0.9375rem] font-semibold ${selected ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>{label}</span>
                <span className="theme-meta mt-0.5 block text-sm leading-5">{description}</span>
              </span>
              <span
                aria-hidden
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected ? "border-[var(--accent-solid)] bg-[var(--accent-solid)] text-[var(--accent-fg)]" : "border-[var(--border-strong)]"
                }`}
              >
                {selected ? (
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5.5 10.5 3 3 6-7" />
                  </svg>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 px-1 text-sm text-[var(--text-secondary)]" aria-live="polite">
        {preference === "system"
          ? `Following your device: currently ${resolvedTheme}.`
          : `Using ${preference} mode on this device.`}
      </p>
      <p className="mt-1 px-1 text-xs text-[var(--text-muted)]">
        The Light/Dark switch in the menu changes this too. Choose System to follow your device again.
      </p>
    </div>
  );
}
