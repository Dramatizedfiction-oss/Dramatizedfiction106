/*
 * Theme preference. Stored per browser under the existing "df-theme" key
 * (the app has no account-level settings store). Values:
 *   "light"  (default when nothing is stored)
 *   "dark"
 *   "system" follow the device's light/dark setting
 * The resolved theme is applied as a class ("light" | "dark") on <html>
 * before first paint by THEME_INIT_SCRIPT, so there is no flash.
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "df-theme";
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "light";

export function parseThemePreference(value: unknown): ThemePreference {
  return value === "dark" || value === "system" || value === "light" ? value : DEFAULT_THEME_PREFERENCE;
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/** Inlined in <head>; must stay self-contained (no imports, no user data). */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=null;try{s=localStorage.getItem(k)}catch(e){}var p=s==="dark"||s==="system"||s==="light"?s:"light";var t=p==="system"?(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;var d=document.documentElement;d.classList.remove("light","dark");d.classList.add(t);d.style.colorScheme=t;d.setAttribute("data-theme-preference",p);}catch(e){}})();`;
