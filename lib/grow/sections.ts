/*
 * The GROW area of the Writer Studio. Each entry is one page under
 * /writer-studio/grow; this list drives the GROW sub-navigation and the
 * overview cards. To add a section: add an entry here and a page at
 * app/writer-studio/(studio)/grow/<slug>/page.tsx that calls requireStudioUser().
 */

export type GrowSectionMeta = {
  href: string;
  navLabel: string;
  title: string;
  summary: string;
};

export const GROW_HOME = "/writer-studio/grow";

export const GROW_SECTIONS: GrowSectionMeta[] = [
  {
    href: GROW_HOME,
    navLabel: "Overview",
    title: "Grow",
    summary: "Why Dramatized Fiction grows with its writers.",
  },
  {
    href: `${GROW_HOME}/share`,
    navLabel: "Share",
    title: "Share Dramatized Fiction",
    summary: "Ready-to-copy links to the platform, your author page and your published series.",
  },
  {
    href: `${GROW_HOME}/social`,
    navLabel: "Social media",
    title: "Social media",
    summary: "How to talk about your stories and the platform where people already are.",
  },
  {
    href: `${GROW_HOME}/audience`,
    navLabel: "Your audience",
    title: "Grow your audience",
    summary: "Practical ways to help readers find, start and keep reading your work.",
  },
  {
    href: `${GROW_HOME}/roadmap`,
    navLabel: "Roadmap",
    title: "Grow with Dramatized Fiction",
    summary: "The platform's phases, and what each one could open up for writers.",
  },
];

export const GROW_SUBSECTIONS = GROW_SECTIONS.filter((section) => section.href !== GROW_HOME);

export function growSection(href: string): GrowSectionMeta {
  const section = GROW_SECTIONS.find((entry) => entry.href === href);
  if (!section) throw new Error(`Unknown GROW section: ${href}`);
  return section;
}
