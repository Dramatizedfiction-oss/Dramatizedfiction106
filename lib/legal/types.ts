// Shapes for the static legal pages (lib/legal/content/*.ts). Text is kept
// exactly as approved; [PLACEHOLDERS] are filled from lib/legal/placeholders.ts.

export type LegalBlock =
  | { type: "p"; text: string }
  /** A bold lead-in line inside a section (e.g. "Information you give us"). */
  | { type: "label"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; columns: string[]; rows: string[][] }
  | { type: "quote"; text: string };

export type LegalSection = { heading: string; blocks: LegalBlock[] };

export type LegalDocument = {
  /** The page heading, as written in the source (e.g. "Dramatized Fiction Terms of Service"). */
  title: string;
  /** Short name for links and the footer. */
  shortTitle: string;
  /** Shown as "Effective [EFFECTIVE DATE]" under the title; false for pages without one (Contact). */
  showEffectiveDate: boolean;
  /** A table of contents at the top (Terms and Privacy). */
  tableOfContents: boolean;
  intro: LegalBlock[];
  sections: LegalSection[];
};
