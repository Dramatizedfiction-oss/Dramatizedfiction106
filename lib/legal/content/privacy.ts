import type { LegalDocument } from "@/lib/legal/types";

// Source: "Dramatized Fiction: Legal Pages (Starter Set)", Privacy Policy. Wording unchanged.
export const privacy: LegalDocument = {
  title: "Dramatized Fiction Privacy Policy",
  shortTitle: "Privacy",
  showEffectiveDate: true,
  tableOfContents: true,
  intro: [
    {
      type: "p",
      text: '[OPERATOR NAME] ("we", "us") runs Dramatized Fiction at [SITE URL]. This policy explains what personal information we collect, why, who sees it, and the choices you have. We do not sell your personal information.',
    },
  ],
  sections: [
    {
      heading: "1. What we collect",
      blocks: [
        { type: "label", text: "Information you give us" },
        {
          type: "ul",
          items: [
            "Account details: your name, email address and password. We store passwords only in hashed form; we cannot read them.",
            "Profile details: display name, profile picture or chosen avatar, and your public or private profile setting.",
            "Your content: series, episodes, drafts and any text you write on the Service.",
            "Age: we do not ask for or store your date of birth.",
            "Messages you send us, such as support requests and copyright notices.",
          ],
        },
        { type: "label", text: "Information collected as you use the Service" },
        {
          type: "ul",
          items: [
            "Reading and activity data: which series and episodes you read, follow and bookmark.",
            "Technical data: IP address, browser and device type, and pages visited, kept in server logs for security and troubleshooting.",
            "Cookies and similar storage described in our Cookie Notice.",
          ],
        },
      ],
    },
    {
      heading: "2. Why we use it",
      blocks: [
        {
          type: "ul",
          items: [
            "To create and run your account and show your library, follows and bookmarks.",
            "To publish your stories and show your public profile as you have set it.",
            "To recommend stories and show you content that fits your settings.",
            "To keep the Service secure and prevent abuse, fraud and spam.",
            "To enforce our Terms and Community Guidelines, including automated screening of posted text and images by a third-party service, and to meet legal duties.",
            "To contact you about your account, security or changes to our terms.",
            "To improve the Service using aggregate usage statistics.",
          ],
        },
        {
          type: "p",
          text: "If you are in the EEA, UK or Switzerland, our legal bases are: performing our contract with you (running your account), our legitimate interests (security, improving the Service), your consent where we ask for it, and legal obligations.",
        },
      ],
    },
    {
      heading: "3. What others can see",
      blocks: [
        {
          type: "p",
          text: "Your display name, profile picture, public profile and published stories are visible to other people, and to anyone if you are not signed in. Your library, follows and bookmarks are private unless you choose to make them public in your profile settings. Your email address is never shown publicly.",
        },
      ],
    },
    {
      heading: "4. Who we share it with",
      blocks: [
        { type: "p", text: "We share information only with:" },
        {
          type: "ul",
          items: [
            "Service providers that help us run the Service, such as hosting, database, email delivery, content screening and, once payments launch, payment processing (e.g. Stripe). They may use the information only to provide services to us.",
            "Authorities or other parties when we believe in good faith that the law requires it, or to protect people's safety and our rights.",
            "A buyer or successor if we are part of a merger, sale or reorganization. We would tell you first.",
          ],
        },
        { type: "p", text: "We do not rent or sell personal information." },
      ],
    },
    {
      heading: "5. Where it is stored",
      blocks: [
        {
          type: "p",
          text: "Our providers may store and process data in the United States and other countries. Where required, we rely on recognised transfer protections such as standard contractual clauses.",
        },
      ],
    },
    {
      heading: "6. How long we keep it",
      blocks: [
        {
          type: "p",
          text: "We keep your information while your account is active. When you delete your account in Settings, your profile, sessions, follows and published stories are removed from the live Service right away. Backups and server logs may keep copies for a limited period, and records we must keep for legal reasons (for example, a copyright notice) may be kept longer.",
        },
      ],
    },
    {
      heading: "7. Your choices and rights",
      blocks: [
        {
          type: "ul",
          items: [
            "Edit your display name, profile picture and visibility in Settings and on your profile.",
            "Delete your account in Settings.",
            "Ask us at [CONTACT EMAIL] for a copy of your information, a correction, or deletion.",
          ],
        },
        {
          type: "p",
          text: "If you are in the EEA, UK or Switzerland you may also object to or restrict some uses, ask for portability, withdraw consent, and complain to your data protection authority. If you are a California resident you may ask us what we have collected, ask us to delete it, and correct it. We will not treat you differently for using these rights. We will reply within the time the law requires.",
        },
      ],
    },
    {
      heading: "8. Children",
      blocks: [
        {
          type: "p",
          text: "The Service is not for children under 13, and we do not knowingly collect their personal information. If you believe a child under 13 has given us information, email [CONTACT EMAIL] and we will delete it.",
        },
      ],
    },
    {
      heading: "9. Security",
      blocks: [
        {
          type: "p",
          text: "We use passwords stored as hashes, secure session cookies and access controls. No system is perfectly secure, so we cannot guarantee absolute security.",
        },
      ],
    },
    {
      heading: "10. Changes",
      blocks: [
        {
          type: "p",
          text: "We will post changes here and update the effective date. For significant changes we will tell you on the Service or by email.",
        },
      ],
    },
    {
      heading: "11. Contact",
      blocks: [{ type: "p", text: "[OPERATOR NAME] · [CONTACT EMAIL]" }],
    },
  ],
};
