"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_STORAGE_KEY,
  parseThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

/*
 * The single source of theme state on the client. The pre-paint script in
 * app/layout.tsx applies the stored preference before React loads; this
 * provider takes over from there: it exposes the preference, applies
 * changes, follows the device setting while "system" is selected, and keeps
 * other tabs in sync.
 */

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ResolvedTheme, preference: ThemePreference) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
  root.setAttribute("data-theme-preference", preference);
}

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  // Adopt what the pre-paint script applied.
  useEffect(() => {
    const initial = parseThemePreference(document.documentElement.getAttribute("data-theme-preference"));
    setPreferenceState(initial);
    setResolvedTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  // Follow the device while "system" is selected.
  useEffect(() => {
    if (preference !== "system" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const next = resolveTheme("system", media.matches);
      setResolvedTheme(next);
      applyTheme(next, "system");
    };
    update();
    // Re-check when the tab comes back too, in case the device switched while
    // the page was in the background.
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [preference]);

  // Another tab changed the preference.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next = parseThemePreference(event.newValue);
      const theme = resolveTheme(next, systemPrefersDark());
      setPreferenceState(next);
      setResolvedTheme(theme);
      applyTheme(theme, next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    const theme = resolveTheme(next, systemPrefersDark());
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked: the choice still applies for this visit.
    }
    setPreferenceState(next);
    setResolvedTheme(theme);
    applyTheme(theme, next);
  }, []);

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference }), [preference, resolvedTheme, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider.");
  return context;
}
