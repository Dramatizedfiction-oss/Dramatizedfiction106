import type { WriterStatusValue } from "@/lib/writer-studio/status";

/*
 * Copy for the GROW area, kept as data so it can be edited without touching
 * components. Rules for anything added here:
 * - Never promise earnings, audience numbers or results.
 * - Label anything that depends on a future phase (`phase2` / `phase3`).
 * - Monetization is Phase 2 and advertising is Phase 3 (lib/phases.ts gates
 *   both); describe them as plans, never as available features.
 */

/** now = usable today; later = planned, not tied to a phase; phase2/phase3 = needs that phase. */
export type Availability = "now" | "later" | "phase2" | "phase3";

export type GrowItem = {
  title: string;
  body: string;
  availability?: Availability;
  /** Limit an item to some writer statuses. Omitted = every writer. */
  statuses?: WriterStatusValue[];
};

/** Items visible to a writer with the given stored User.writerStatus. */
export function forStatus<T extends { statuses?: WriterStatusValue[] }>(
  items: T[],
  status: string | null | undefined,
): T[] {
  const current = (status || "BEGINNER") as WriterStatusValue;
  return items.filter((item) => !item.statuses || item.statuses.includes(current));
}

export const GROW_INTRO = {
  eyebrow: "Grow",
  title: "Dramatized Fiction grows with its writers.",
  body:
    "Every reader who discovers the platform is a reader who can discover your stories. As more people find Dramatized Fiction, the platform can do more for the writers building it. This is your base for being part of that.",
};

export const GROW_TEAM_MESSAGE = {
  title: "You're building more than a bookshelf.",
  body:
    "You aren't just publishing stories here. You're helping build the audience that makes Dramatized Fiction bigger, and that growth is what creates new opportunities for every writer on it.",
};

export const GROW_OPPORTUNITIES: GrowItem[] = [
  {
    title: "Audience growth",
    body: "Every link you share brings people to the platform, and to your work. Readers who arrive for one story stay for the next.",
    availability: "now",
  },
  {
    title: "Increased discovery",
    body: "Discovery and recommendation features are planned to expand as the library and readership grow.",
    availability: "phase3",
  },
  {
    title: "Future monetization",
    body: "Phase 2 is designed to give writers ways to earn from their work. It is not active yet.",
    availability: "phase2",
  },
  {
    title: "Promotional opportunities",
    body: "Campaigns and ready-made promotional material are planned for this area.",
    availability: "later",
  },
  {
    title: "Platform features",
    body: "New Writer Studio and reading features are added as the platform develops.",
    availability: "later",
  },
  {
    title: "Writer resources",
    body: "Guides on sharing, social media and building an audience will be collected in GROW.",
    availability: "later",
  },
];

export const GROW_OPPORTUNITIES_NOTE =
  "These are possibilities, not guarantees. Anything that depends on a future phase is labelled, and nothing here promises readers or income.";

export const SOCIAL_INTRO =
  "Most readers find new stories through people they already follow. This section will hold resources for sharing Dramatized Fiction and your work on social media.";

export const SOCIAL_PLANNED: GrowItem[] = [
  { title: "Talking about your stories", body: "How to describe your series in a post without giving the story away.", availability: "later" },
  { title: "Where to post", body: "Which communities and platforms suit serialized fiction.", availability: "later" },
  { title: "Links to use", body: "Which page to send people to, and when.", availability: "later" },
  { title: "Promotional material", body: "Ready-to-use images and copy for your series.", availability: "later" },
];

export const AUDIENCE_INTRO =
  "Writers can actively help readers find them. None of this guarantees numbers, but each step makes it easier for the right reader to start, and keep, reading your work.";

export const AUDIENCE_STARTING_POINTS: GrowItem[] = [
  {
    title: "Send people to your author page",
    body: "It collects every series you've published in one place, so one link covers everything you write.",
    availability: "now",
  },
  {
    title: "Link straight to Episode 1",
    body: "A first-episode link drops a new reader directly into the story instead of an overview.",
    availability: "now",
  },
  {
    title: "Make the first impression count",
    body: "Your series title, cover and description are what readers see on Explore and on the series page. Keep them sharp.",
    availability: "now",
  },
  {
    title: "Publish on a rhythm",
    body: "New episodes give readers a reason to come back. A steady pace helps more than occasional bursts.",
    availability: "now",
  },
];

export const AUDIENCE_PLANNED =
  "Sharing tips, promotion ideas, audience-building guides and ways to encourage readers to follow your work will be added here.";

export type PhaseInfo = {
  number: 1 | 2 | 3;
  name: string;
  summary: string;
  items: GrowItem[];
  note?: string;
};

export const PHASES: PhaseInfo[] = [
  {
    number: 1,
    name: "Foundation",
    summary:
      "Building the library and the readership. Reading is free, and writers have the tools to publish and be found.",
    items: [
      { title: "Publish series and episodes", body: "Write, preview and publish from Writer Studio.", availability: "now" },
      { title: "Public author page", body: "A page that collects all of your published work.", availability: "now" },
      { title: "Free reading", body: "Nothing on the platform costs readers anything.", availability: "now" },
      { title: "Share links", body: "Real links to the platform and your published work.", availability: "now" },
    ],
  },
  {
    number: 2,
    name: "Monetization",
    summary:
      "The stage designed to let writers earn from their work, once the platform has the readership to support it.",
    items: [
      { title: "Locked episodes and series", body: "Choose which of your episodes or series readers unlock.", availability: "phase2" },
      { title: "Writer-set pricing", body: "Set your own prices where pricing is supported.", availability: "phase2" },
      { title: "Dramatiz+", body: "A planned reader subscription for access across the platform.", availability: "phase2" },
      { title: "Direct purchases", body: "Readers buying a specific episode or series.", availability: "phase2" },
      { title: "Author payouts", body: "A payout system for writers, planned through Stripe Connect.", availability: "phase2" },
    ],
    note:
      "Pricing, revenue share and eligibility are not final and will be announced before Phase 2 opens. None of this is available yet, and none of it is a promise of income.",
  },
  {
    number: 3,
    name: "Discovery and advertising",
    summary: "Growing reach across the platform, with new ways for growth to create opportunities.",
    items: [
      { title: "Better discovery and ranking", body: "Improvements to how readers find new series.", availability: "phase3" },
      { title: "Advertising", body: "Ads between episodes, never while someone is reading.", availability: "phase3" },
      { title: "Sponsored content", body: "Sponsored placements across the platform.", availability: "phase3" },
      { title: "New growth opportunities", body: "Further ways a larger platform can benefit its writers.", availability: "phase3" },
    ],
  },
];

export const ROADMAP_INTRO =
  "Dramatized Fiction opens in phases. Each one builds on the readership the last one created. Phases are switched on by the platform's leadership; nothing on this page can change them.";
