import type { LegalDocument } from "@/lib/legal/types";

// Source: "Dramatized Fiction: Legal Pages (Starter Set)", Community Guidelines. Wording unchanged.
export const guidelines: LegalDocument = {
  title: "Dramatized Fiction Community Guidelines",
  shortTitle: "Guidelines",
  showEffectiveDate: true,
  tableOfContents: false,
  intro: [
    {
      type: "p",
      text: "Dramatized Fiction is a place to discover and share serial fiction. All genres are welcome, including dark and difficult themes, as long as stories are handled with care and labeled honestly. These guidelines are part of our Terms.",
    },
  ],
  sections: [
    {
      heading: "1. Never allowed",
      blocks: [
        { type: "p", text: "We remove this content and may end the account without warning:" },
        {
          type: "ul",
          items: [
            "Any sexual content involving minors, or sexualized depictions of characters who are written as, or appear to be, under 18.",
            "Real threats, calls for violence, or content that helps plan harm to real people.",
            "Harassment, doxxing (sharing someone's private information) and targeted abuse of other members.",
            "Content that promotes hatred of people for who they are: race, ethnicity, religion, disability, sex, gender identity, sexual orientation or similar traits. Fiction may depict bigotry; it may not be written to promote it.",
            "Content that encourages suicide or self-harm, or gives instructions for it.",
            "Instructions for weapons, malware, or other serious harm presented as fiction.",
            "Spam, scams, phishing, and fake accounts or impersonation.",
            "Stories copied from other writers, or content that infringes copyright.",
          ],
        },
      ],
    },
    {
      heading: "2. Mature content",
      blocks: [
        {
          type: "p",
          text: "Explicit sexual content is not allowed on Dramatized Fiction at this time. We may add a separate, age-confirmed area in the future with its own rules. Until then:",
        },
        {
          type: "ul",
          items: [
            "Stories may deal with romance, violence, grief, abuse and other serious themes, but must not be explicit. Fade to black rather than show.",
            "Graphic violence should serve the story and not be the point of it.",
            "If your story has mature themes, say so clearly in its description or content labels so readers can choose.",
          ],
        },
      ],
    },
    {
      heading: "3. AI-use labels",
      blocks: [
        { type: "p", text: "Readers deserve to know how a story was made." },
        {
          type: "ul",
          items: [
            "Every series must carry the AI-use label that matches how it was written.",
            "Be honest. If you used AI to draft, rewrite or generate substantial parts, say so.",
            "Mislabeling may lead to relabeling, reduced visibility, removal or suspension.",
            "Readers can report a label they believe is wrong, and we will review it.",
          ],
        },
      ],
    },
    {
      heading: "4. Respect other people",
      blocks: [
        {
          type: "ul",
          items: [
            "Critique the work, not the person. Reviews and comments should be constructive.",
            "Do not repost, copy or republish another writer's work without permission.",
            "Do not use someone else's name, image or identity in a way that could mislead.",
            "Respect profile privacy settings. Do not try to find out who someone is offline.",
          ],
        },
      ],
    },
    {
      heading: "5. Reporting",
      blocks: [
        {
          type: "p",
          text: "Email [CONTACT EMAIL] with a link to the content and a short reason. If a story's AI-use label looks wrong, use the report link next to the label. We review reports and may remove content, label it, limit its visibility, warn the author or suspend the account.",
        },
      ],
    },
    {
      heading: "6. What happens when rules are broken",
      blocks: [
        {
          type: "ol",
          items: [
            "Content is removed or restricted.",
            "A warning is sent to the author where appropriate.",
            "Repeated or serious violations lead to suspension or permanent removal.",
          ],
        },
        { type: "p", text: "Illegal content, or content that puts people in danger, may be reported to the authorities." },
      ],
    },
    {
      heading: "7. Appeals",
      blocks: [
        {
          type: "p",
          text: "If you think we made a mistake, email [CONTACT EMAIL] with your username and the content in question. A person will take a second look.",
        },
      ],
    },
  ],
};
