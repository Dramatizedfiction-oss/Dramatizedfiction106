import type { LegalDocument } from "@/lib/legal/types";

// Source: "Dramatized Fiction: Legal Pages (Starter Set)", Terms of Service. Wording unchanged.
export const terms: LegalDocument = {
  title: "Dramatized Fiction Terms of Service",
  shortTitle: "Terms",
  showEffectiveDate: true,
  tableOfContents: true,
  intro: [
    {
      type: "p",
      text: 'These Terms are an agreement between you and [OPERATOR NAME] ("we", "us"), the operator of Dramatized Fiction at [SITE URL] (the "Service"). By creating an account or using the Service, you agree to these Terms and to our Privacy Policy, Community Guidelines and Copyright Policy. If you do not agree, do not use the Service.',
    },
  ],
  sections: [
    {
      heading: "1. Who can use Dramatized Fiction",
      blocks: [
        {
          type: "p",
          text: "You must be at least 13 years old to use the Service. If you are under the age of majority where you live, you need a parent or guardian's permission. If we learn that someone under 13 has an account, we will delete it. Paid features and mature content are not available yet. If we add them, they will require you to be 18 or older.",
        },
      ],
    },
    {
      heading: "2. Your account",
      blocks: [
        {
          type: "p",
          text: "Give accurate information and keep your password private. You are responsible for what happens on your account. Tell us at [CONTACT EMAIL] if you think someone else has accessed it. You may not create accounts to evade a suspension or ban, or share an account with other people.",
        },
      ],
    },
    {
      heading: "3. Your content",
      blocks: [
        {
          type: "p",
          text: 'You keep ownership of the stories, episodes, profile text, images and other material you post ("Your Content"). You are responsible for it, and you promise that you own it or have permission to post it.',
        },
        {
          type: "p",
          text: "By posting, you give us a non-exclusive, worldwide, royalty-free license to host, store, display, format, distribute and promote Your Content on and around the Service, including in previews, search, recommendations and our own marketing for the Service. This license ends when you delete the content or your account, except for copies in backups for a limited time, and copies other members have lawfully saved for personal reading.",
        },
        {
          type: "p",
          text: "We will not sell your stories or license them to third parties for their own use without your permission.",
        },
      ],
    },
    {
      heading: "4. AI-generated content",
      blocks: [
        {
          type: "p",
          text: "If your work was written with the help of AI tools, you must label it using the AI-use label when you publish. Labels must be honest. Mislabeling may lead to removal, reduced visibility or suspension. Details are in the Community Guidelines.",
        },
      ],
    },
    {
      heading: "5. Rules",
      blocks: [
        { type: "p", text: "You agree to follow the Community Guidelines and to not:" },
        {
          type: "ul",
          items: [
            "break the law or help others break it;",
            "post content that infringes someone else's copyright or other rights;",
            "harass, threaten or impersonate other people;",
            "scrape, copy or republish other members' stories without their permission;",
            "use bots, or interfere with, probe or attack the Service or its security;",
            "upload malware or try to gain access to accounts or data that are not yours.",
          ],
        },
        {
          type: "p",
          text: "We may remove content or restrict accounts that break these rules. We are not required to monitor content, but we may.",
        },
      ],
    },
    {
      heading: "6. Reader and writer features",
      blocks: [
        {
          type: "p",
          text: "Series, episodes, follows, bookmarks and similar features may change, be added, or be removed as we develop the Service. Some features are experimental. We do not promise that any story or feature will always be available.",
        },
      ],
    },
    {
      heading: "7. Payments",
      blocks: [
        {
          type: "p",
          text: "Paid features are not live yet. When they are, prices, billing terms and refund rules will be shown before you buy and will be added here. Payments will be handled by a third-party processor such as Stripe.",
        },
      ],
    },
    {
      heading: "8. Copyright",
      blocks: [
        {
          type: "p",
          text: "We respond to copyright complaints under the U.S. Digital Millennium Copyright Act. See our Copyright Policy for how to send a notice and how to dispute one. We end the accounts of members who are repeat infringers.",
        },
      ],
    },
    {
      heading: "9. Suspension and ending your account",
      blocks: [
        {
          type: "p",
          text: "You can delete your account at any time in Settings. Deleting an account removes your profile, follows and sessions immediately, and also removes every story and episode you published. This cannot be undone.",
        },
        {
          type: "p",
          text: "We may warn, suspend or end accounts and remove content that breaks these Terms or the Community Guidelines, creates legal risk, or harms other members. Where reasonable we will tell you why.",
        },
      ],
    },
    {
      heading: "10. Our rights",
      blocks: [
        {
          type: "p",
          text: "The Service, its design, code and branding belong to us or our licensors. These Terms give you a limited, personal, non-transferable right to use the Service. Feedback you send us may be used without obligation to you.",
        },
      ],
    },
    {
      heading: "11. Third-party links and services",
      blocks: [
        {
          type: "p",
          text: "The Service may link to other sites or use third-party services. We do not control them and are not responsible for them.",
        },
      ],
    },
    {
      heading: "12. Disclaimers",
      blocks: [
        {
          type: "p",
          text: 'The Service is provided "as is" and "as available". We do not guarantee that it will be uninterrupted, error-free or secure, and we are not responsible for content posted by members. Some places do not allow these exclusions, so they may not apply to you.',
        },
      ],
    },
    {
      heading: "13. Limit of liability",
      blocks: [
        {
          type: "p",
          text: "To the extent the law allows, we are not liable for indirect, incidental or consequential damages, or for lost profits, data or reputation. Our total liability to you for any claim about the Service is limited to the greater of the amount you paid us in the 12 months before the claim or US$100. Nothing here limits liability that cannot be limited by law.",
        },
      ],
    },
    {
      heading: "14. Indemnity",
      blocks: [
        {
          type: "p",
          text: "You agree to cover losses and reasonable legal costs we suffer because of Your Content or your breach of these Terms, to the extent the law allows.",
        },
      ],
    },
    {
      heading: "15. Governing law",
      blocks: [
        {
          type: "p",
          text: "These Terms are governed by the laws of [GOVERNING LAW]. Disputes will be handled in the courts of that place, unless the law where you live gives you the right to bring a claim elsewhere. Please contact us first at [CONTACT EMAIL]; most problems can be sorted out directly.",
        },
      ],
    },
    {
      heading: "16. Changes",
      blocks: [
        {
          type: "p",
          text: "We may update these Terms. For important changes we will give notice on the Service or by email. If you keep using the Service after the effective date of a change, you accept it.",
        },
      ],
    },
    {
      heading: "17. Contact",
      blocks: [{ type: "p", text: "[OPERATOR NAME] · [CONTACT EMAIL]" }],
    },
  ],
};
