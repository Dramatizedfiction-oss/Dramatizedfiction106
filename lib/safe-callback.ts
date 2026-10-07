// Client-safe (no server imports): used by sign-in UI and re-exported by
// lib/auth/guards.ts.

const CALLBACK_FALLBACK = "/explore";
const CALLBACK_MAX_LENGTH = 2048;
const INTERNAL_ORIGIN = "http://df.internal";

/**
 * Returns `value` only if it is a same-origin path ("/explore",
 * "/series/abc?x=1#y"); otherwise the fallback. Rejects absolute URLs,
 * scheme URLs, protocol-relative "//host", backslash variants that browsers
 * normalize to "//host", and anything containing whitespace or control
 * characters (which browsers may strip before parsing).
 */
export function safeCallbackPath(value: unknown, fallback = CALLBACK_FALLBACK): string {
  if (typeof value !== "string" || value.length === 0 || value.length > CALLBACK_MAX_LENGTH) {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (value.includes("\\") || /[\s\u0000-\u001f\u007f]/.test(value)) {
    return fallback;
  }

  let parsed: URL;
  try {
    parsed = new URL(value, INTERNAL_ORIGIN);
  } catch {
    return fallback;
  }

  if (parsed.origin !== INTERNAL_ORIGIN) {
    return fallback;
  }

  // Dot-segment normalization can turn "/.//evil.com" into "//evil.com".
  const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  if (normalized.startsWith("//")) {
    return fallback;
  }

  return normalized;
}
