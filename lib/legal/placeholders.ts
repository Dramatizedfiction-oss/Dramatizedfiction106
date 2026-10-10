/*
 * THE ONE PLACE TO FILL IN THE LEGAL PAGES' PLACEHOLDERS.
 *
 * Every [BRACKETED] placeholder in lib/legal/content/*.ts is replaced from this
 * map when the page renders. While a value is null, the placeholder shows
 * exactly as written (e.g. "[CONTACT EMAIL]"). To fill one in everywhere,
 * set its value here, for example:
 *   "CONTACT EMAIL": "support@dramatizedfiction.com",
 *
 * "COPYRIGHT AGENT" replaces the whole "[COPYRIGHT AGENT: name, mailing
 * address, email]" text on the Copyright Policy page.
 */
export const LEGAL_PLACEHOLDERS: Record<string, string | null> = {
  "OPERATOR NAME": null,
  "SITE URL": null,
  "CONTACT EMAIL": null,
  "GOVERNING LAW": null,
  "COPYRIGHT AGENT": null,
  "EFFECTIVE DATE": null,
};

const TOKEN = /\[([A-Z][A-Z ]*[A-Z])(?::[^\]]*)?\]/g;

/** Replaces known [PLACEHOLDER] tokens with their filled-in value, leaving unfilled ones as written. */
export function fillPlaceholders(text: string): string {
  return text.replace(TOKEN, (match, key: string) => LEGAL_PLACEHOLDERS[key] ?? match);
}

/** Every distinct placeholder token appearing in the given text (for checks and reports). */
export function findPlaceholders(text: string): string[] {
  return Array.from(new Set(text.match(TOKEN) ?? []));
}
