"use client";

import { MoonIcon, SettingsIcon, SunIcon } from "@/components/icons";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; description: string; Icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", description: "Bright and clean. The default.", Icon: SunIcon },
  { value: "dark", label: "Dark", description: "Cinematic, for night reading.", Icon: MoonIcon },
  { value: "system", label: "System", description: "Follow your device's setting.", Icon: SettingsIcon },
];

export default function ThemePreferenceControl() {
  const { preference, resolvedTheme, setPreference } = useTheme();

  return (
    <div>
      <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map(({ value, label, description, Icon }) => {
          const selected = preference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPreference(value)}
              className="ui-choice flex flex-col items-start gap-2 rounded-2xl p-4 text-left"
            >
              <span className={`flex items-center gap-2 font-semibold ${selected ? "text-[var(--accent)]" : ""}`}>
                <Icon size={16} />
                {label}
              </span>
              <span className="text-sm text-[var(--text-secondary)]">{description}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-[var(--text-secondary)]" aria-live="polite">
        {preference === "system"
          ? `Following your device: currently ${resolvedTheme}.`
          : `Using ${preference} mode on this device.`}
      </p>
    </div>
  );
}
