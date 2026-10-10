import type { LegalDocument } from "@/lib/legal/types";

// Source: "Dramatized Fiction: Legal Pages (Starter Set)", Cookie Notice. Wording unchanged.
// The notice has no numbered sections, so its text is all "intro".
export const cookies: LegalDocument = {
  title: "Dramatized Fiction Cookie Notice",
  shortTitle: "Cookies",
  showEffectiveDate: true,
  tableOfContents: false,
  intro: [
    {
      type: "p",
      text: "Dramatized Fiction uses only the cookies and browser storage it needs to work. We do not use advertising or tracking cookies, so there is nothing to opt out of.",
    },
    {
      type: "table",
      columns: ["Name or type", "What it does", "How long"],
      rows: [
        ["Session cookie", "Keeps you signed in. Secure and not readable by scripts on the page.", "Until you sign out or it expires"],
        ["df-theme (browser storage)", "Remembers your Light, Dark or System choice", "Until you clear your browser data"],
        [
          "Reading preferences (browser storage)",
          "Remembers your text size, line spacing, reading width and motion setting",
          "Until you clear your browser data",
        ],
      ],
    },
    {
      type: "p",
      text: 'These are "strictly necessary" or preference items that you ask for, and so they do not need a consent banner under current EU and UK rules. If we add analytics, advertising or other non-essential cookies in the future, we will ask for your consent first and update this notice.',
    },
    { type: "p", text: "You can delete or block cookies in your browser settings, but you will not be able to stay signed in." },
    { type: "p", text: "Questions: [CONTACT EMAIL]" },
  ],
  sections: [],
};
