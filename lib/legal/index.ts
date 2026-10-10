import { contact } from "@/lib/legal/content/contact";
import { cookies } from "@/lib/legal/content/cookies";
import { copyright } from "@/lib/legal/content/copyright";
import { guidelines } from "@/lib/legal/content/guidelines";
import { privacy } from "@/lib/legal/content/privacy";
import { terms } from "@/lib/legal/content/terms";

/** The six public legal pages, in footer order. Each route renders LEGAL_DOCUMENTS[slug]. */
export const LEGAL_DOCUMENTS = { terms, privacy, guidelines, copyright, cookies, contact } as const;

export type LegalSlug = keyof typeof LEGAL_DOCUMENTS;

export const LEGAL_LINKS: { href: `/${LegalSlug}`; label: string }[] = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/guidelines", label: "Guidelines" },
  { href: "/copyright", label: "Copyright" },
  { href: "/cookies", label: "Cookies" },
  { href: "/contact", label: "Contact" },
];

/** Anchor id for a section heading ("3. Your content" -> "your-content"). */
export function sectionId(heading: string) {
  return heading
    .toLowerCase()
    .replace(/^\d+\.\s*/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
