import type { LegalDocument } from "@/lib/legal/types";

// Source: "Dramatized Fiction: Legal Pages (Starter Set)", Copyright and Takedown Policy. Wording unchanged.
export const copyright: LegalDocument = {
  title: "Dramatized Fiction Copyright Policy",
  shortTitle: "Copyright",
  showEffectiveDate: true,
  tableOfContents: false,
  intro: [
    {
      type: "p",
      text: "We respect the rights of writers and other creators and ask members to do the same. We respond to notices of alleged copyright infringement under the U.S. Digital Millennium Copyright Act (DMCA), and apply the same process to everyone worldwide.",
    },
  ],
  sections: [
    {
      heading: "1. Sending a takedown notice",
      blocks: [
        {
          type: "p",
          text: "If you believe content on Dramatized Fiction infringes your copyright, send a written notice to our designated agent:",
        },
        { type: "p", text: "[COPYRIGHT AGENT: name, mailing address, email]" },
        { type: "p", text: "Your notice must include:" },
        {
          type: "ol",
          items: [
            "Your name, address, email and a signature (typing your full name is fine).",
            "A description of the copyrighted work you say has been infringed.",
            "The exact link to the content on Dramatized Fiction you want removed.",
            "A statement that you have a good-faith belief the use is not authorized by the copyright owner, its agent or the law.",
            "A statement, under penalty of perjury, that the information in the notice is accurate and that you are the owner or authorized to act for the owner.",
          ],
        },
        { type: "p", text: "Sending a false notice can make you legally liable for damages." },
      ],
    },
    {
      heading: "2. What we do",
      blocks: [
        {
          type: "p",
          text: "When we receive a complete notice we will remove or disable access to the content and tell the member who posted it, with a copy of the notice.",
        },
      ],
    },
    {
      heading: "3. Counter-notice",
      blocks: [
        {
          type: "p",
          text: "If you posted content that was removed and you believe it was a mistake or you have permission, you may send a counter-notice to the same address. It must include:",
        },
        {
          type: "ol",
          items: [
            "Your name, address, email and signature.",
            "A description of the removed content and where it appeared.",
            "A statement, under penalty of perjury, that you have a good-faith belief it was removed because of a mistake or misidentification.",
            "A statement that you consent to the jurisdiction of the courts for your address (or, if outside the United States, the courts where [OPERATOR NAME] is located), and will accept legal papers from the person who sent the original notice.",
          ],
        },
        {
          type: "p",
          text: "We will pass your counter-notice to the person who complained. Unless they tell us within 10 to 14 business days that they have started a court action, we may restore the content.",
        },
      ],
    },
    {
      heading: "4. Repeat infringers",
      blocks: [{ type: "p", text: "We end the accounts of members who are found to repeatedly infringe copyright." }],
    },
    {
      heading: "5. Stories copied from other sites",
      blocks: [
        {
          type: "p",
          text: "If someone has copied your story from Dramatized Fiction to another site, you may ask us to help. We cannot take down other sites, but we can provide your published dates and a link for your own notice.",
        },
      ],
    },
    {
      heading: "6. Other complaints",
      blocks: [
        {
          type: "p",
          text: "For non-copyright issues, such as harassment or privacy concerns, use the reporting steps in the Community Guidelines.",
        },
      ],
    },
  ],
};
