import type { LegalDocument } from "@/lib/legal/types";

// Source: "Dramatized Fiction: Legal Pages (Starter Set)", Contact page text. Wording unchanged.
// The source gives no title or effective date for this page; "Contact" is the route's name.
export const contact: LegalDocument = {
  title: "Contact",
  shortTitle: "Contact",
  showEffectiveDate: false,
  tableOfContents: false,
  intro: [
    {
      type: "quote",
      text: "Questions, problems or feedback? Email us at [CONTACT EMAIL]. For account help, include the email you signed up with. To report a story, email us with the link and a short reason. Copyright complaints go to our designated agent, described in the Copyright Policy. We aim to reply within a few days.",
    },
  ],
  sections: [],
};
