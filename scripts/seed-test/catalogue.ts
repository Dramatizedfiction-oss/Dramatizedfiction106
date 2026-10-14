/*
 * Sweep 17 test catalogue: accounts, series and activity. Everything here is
 * original placeholder content. Test data is found by one marker only: the
 * accounts' email domain (TEST_EMAIL_DOMAIN). Every series, episode, rating,
 * bookmark, comment, follow and read is owned by one of those accounts.
 * Episode text lives in ./content/*.ts, covers in public/test-covers/.
 */

export const TEST_EMAIL_DOMAIN = "test.dramatizedfiction.invalid";
export const testEmail = (handle: string) => `${handle}@${TEST_EMAIL_DOMAIN}`;

export type WriterKey = "A" | "B" | "C" | "D" | "E";
export type ReaderKey = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8";
export type AccountKey = WriterKey | ReaderKey;

export const WRITERS: Record<WriterKey, { name: string; handle: string; bio: string; writerStatus: "BEGINNER" | "FULL" | "FEATURED" | "ELITE" }> = {
  A: {
    name: "Test Writer A",
    handle: "test-writer-a",
    bio: "Writes salt-bitten fantasy and quiet science fiction. Tea first, then maps, then the words.",
    writerStatus: "ELITE",
  },
  B: {
    name: "Test Writer B",
    handle: "test-writer-b",
    bio: "Sea stories and late-night diner comedy. Believes every good scene has a kettle in it somewhere.",
    writerStatus: "FEATURED",
  },
  C: {
    name: "Test Writer C",
    handle: "test-writer-c",
    bio: "Letters, maps and old houses. Romance and history, with the occasional ghost who wants paperwork.",
    writerStatus: "FULL",
  },
  D: {
    name: "Test Writer D",
    handle: "test-writer-d",
    bio: "Locked rooms, ticking clocks and people who notice small things. Mystery and thriller.",
    writerStatus: "BEGINNER",
  },
  E: {
    name: "Test Writer E",
    handle: "test-writer-e",
    bio: "Fog, small towns and growing up. Atmospheric horror and coming-of-age stories.",
    writerStatus: "FULL",
  },
};

export const READERS: Record<ReaderKey, { name: string; handle: string; bio: string; publicProfile: boolean }> = {
  R1: { name: "Test Reader Fenna", handle: "test-reader-1", bio: "Mostly fantasy. Give me a crown and a coastline.", publicProfile: true },
  R2: { name: "Test Reader Marlow", handle: "test-reader-2", bio: "Mysteries, alibis and anything with a floor plan.", publicProfile: false },
  R3: { name: "Test Reader Orrin", handle: "test-reader-3", bio: "Science fiction, the stranger the better.", publicProfile: true },
  R4: { name: "Test Reader Rosalind", handle: "test-reader-4", bio: "Romance and historical fiction. Letters especially.", publicProfile: false },
  R5: { name: "Test Reader Hollis", handle: "test-reader-5", bio: "Horror and thrillers, read with the lights on.", publicProfile: false },
  R6: { name: "Test Reader Juniper", handle: "test-reader-6", bio: "Comedy and coming-of-age. Cosy over grim.", publicProfile: true },
  R7: { name: "Test Reader Sasha", handle: "test-reader-7", bio: "A bit of everything.", publicProfile: false },
  R8: { name: "Test Reader Pim", handle: "test-reader-8", bio: "New here.", publicProfile: false },
};

export type AiTag = "AI_FREE" | "AI_CORRECTED" | "AI_HEAVY" | "AI_WRITTEN";

export type SeriesKey =
  | "salt-crown"
  | "tidecaller"
  | "orbit-nine"
  | "lighthouse-letters"
  | "ninth-floor-alibi"
  | "what-the-fog-keeps"
  | "zero-hour-courier"
  | "cartographers-daughter"
  | "night-shift-mabels"
  | "seventeen-minutes-late"
  | "quiet-ration"
  | "ghost-tax";

export type SeriesDef = {
  key: SeriesKey;
  title: string;
  author: WriterKey;
  /** One of lib/genres.ts. */
  genre: string;
  tags: string[];
  description: string;
  aiUsageTag: AiTag;
  themeColor: string | null;
  /** Static file in public/test-covers/, or null (no cover on purpose). */
  cover: string | null;
  isComplete: boolean;
  /** false: the series stays a draft (Ghost Tax). */
  published: boolean;
  /** Episode 1's publish date, in days before the seed run; then one every `everyDays`. */
  startDaysAgo: number;
  everyDays: number;
};

export const SERIES: SeriesDef[] = [
  {
    key: "salt-crown",
    title: "The Salt Crown",
    author: "A",
    genre: "fantasy",
    tags: ["epic", "sea", "court"],
    description:
      "When the tide-bound crown of Merrow Isle chooses a fishmonger's daughter, Isla Brack must survive a court that wanted anyone else, and a sea that remembers every oath.",
    aiUsageTag: "AI_FREE",
    themeColor: "#1d6f8a",
    cover: "/test-covers/salt-crown.webp",
    isComplete: false,
    published: true,
    startDaysAgo: 85,
    everyDays: 6,
  },
  {
    key: "tidecaller",
    title: "Tidecaller",
    author: "B",
    genre: "fantasy",
    tags: ["adventure", "sea", "magic"],
    description:
      "Corin can call the tide, but only a little, and only when he's scared. Which is a problem, because the ship he has stowed away on is sailing for the edge of the map.",
    aiUsageTag: "AI_CORRECTED",
    themeColor: "#0f766e",
    cover: "/test-covers/tidecaller.webp",
    isComplete: false,
    published: true,
    startDaysAgo: 30,
    everyDays: 5,
  },
  {
    key: "orbit-nine",
    title: "Orbit Nine",
    author: "A",
    genre: "sci-fi",
    tags: ["space station", "mystery", "found family"],
    description:
      "Station Nine was built to watch a dead planet. Then the planet started sending messages, and the seven people aboard have to decide whether to answer.",
    aiUsageTag: "AI_CORRECTED",
    themeColor: "#4338ca",
    cover: "/test-covers/orbit-nine.webp",
    isComplete: false,
    published: true,
    startDaysAgo: 89,
    everyDays: 7,
  },
  {
    key: "lighthouse-letters",
    title: "Letters to the Lighthouse Keeper",
    author: "C",
    genre: "romance",
    tags: ["epistolary", "slow burn", "coast"],
    description:
      "A misdirected letter reaches the keeper of a remote lighthouse. She writes back. Six letters later, neither of them is sure who is keeping whom afloat.",
    aiUsageTag: "AI_FREE",
    themeColor: "#be185d",
    cover: "/test-covers/lighthouse-letters.webp",
    isComplete: true,
    published: true,
    startDaysAgo: 70,
    everyDays: 8,
  },
  {
    key: "ninth-floor-alibi",
    title: "The Ninth Floor Alibi",
    author: "D",
    genre: "mystery",
    tags: ["whodunit", "office", "detective"],
    description:
      "Everyone on the ninth floor was in the meeting when the safe was emptied. Inspector Dara Quell has a room full of perfect alibis and one coffee cup too many.",
    aiUsageTag: "AI_FREE",
    themeColor: "#7c2d12",
    cover: "/test-covers/ninth-floor-alibi.webp",
    isComplete: false,
    published: true,
    startDaysAgo: 50,
    everyDays: 6,
  },
  {
    key: "what-the-fog-keeps",
    title: "What the Fog Keeps",
    author: "E",
    genre: "horror",
    tags: ["atmospheric", "small town", "folk horror"],
    description:
      "Every autumn the fog comes into Wrenhaven and stays for three days. This year, when it lifts, the church bell is ringing one more time than it should.",
    aiUsageTag: "AI_HEAVY",
    themeColor: "#475569",
    cover: "/test-covers/what-the-fog-keeps.webp",
    isComplete: false,
    published: true,
    startDaysAgo: 12,
    everyDays: 3,
  },
  {
    key: "zero-hour-courier",
    title: "Zero Hour Courier",
    author: "D",
    genre: "thriller",
    tags: ["chase", "city", "conspiracy"],
    description:
      "Bike courier Tamsin Roe has one rule: never look inside the package. Tonight the package is looking for her.",
    aiUsageTag: "AI_WRITTEN",
    themeColor: "#b91c1c",
    cover: "/test-covers/zero-hour-courier.webp",
    isComplete: false,
    published: true,
    startDaysAgo: 60,
    everyDays: 6,
  },
  {
    key: "cartographers-daughter",
    title: "The Cartographer's Daughter",
    author: "C",
    genre: "historical",
    tags: ["maps", "1700s", "family secrets"],
    description:
      "Her father drew the coastline for a king. When he dies with one map unfinished, Elinor Vane follows its blank edge to find out what he refused to draw.",
    aiUsageTag: "AI_CORRECTED",
    themeColor: "#92400e",
    cover: "/test-covers/cartographers-daughter.webp",
    isComplete: true,
    published: true,
    startDaysAgo: 80,
    everyDays: 9,
  },
  {
    key: "night-shift-mabels",
    title: "Night Shift at Mabel's",
    author: "B",
    genre: "comedy",
    tags: ["slice of life", "diner", "ensemble"],
    description:
      "Mabel's Diner never closes, which means somebody has to be there at 3 a.m. Usually that's Gus, a cook with opinions, and whoever wanders in from the rain.",
    aiUsageTag: "AI_FREE",
    themeColor: "#ca8a04",
    cover: "/test-covers/night-shift-mabels.webp",
    isComplete: false,
    published: true,
    startDaysAgo: 45,
    everyDays: 4.5,
  },
  {
    key: "seventeen-minutes-late",
    title: "Seventeen Minutes Late",
    author: "E",
    genre: "literary",
    tags: ["young adult", "coming of age", "school"],
    description:
      "Noa misses the bus by seventeen minutes and ends up walking to school with the one person she has avoided all year. It becomes a habit. It becomes a lot of things.",
    aiUsageTag: "AI_CORRECTED",
    themeColor: null,
    cover: null,
    isComplete: false,
    published: true,
    startDaysAgo: 20,
    everyDays: 4,
  },
  {
    key: "quiet-ration",
    title: "The Quiet Ration",
    author: "A",
    genre: "sci-fi",
    tags: ["dystopian", "short"],
    description: "In the city of measured words, every citizen gets two hundred a day. Wren has saved hers for a year.",
    aiUsageTag: "AI_HEAVY",
    themeColor: "#334155",
    cover: "/test-covers/quiet-ration.webp",
    isComplete: false,
    published: true,
    startDaysAgo: 6,
    everyDays: 1,
  },
  {
    key: "ghost-tax",
    title: "Ghost Tax",
    author: "C",
    genre: "fantasy",
    tags: ["urban fantasy", "paranormal", "comedy"],
    description: "The city has started taxing hauntings. Junior assessor Priya Lal has to collect from a ghost who insists he's merely visiting.",
    aiUsageTag: "AI_FREE",
    themeColor: "#6d28d9",
    cover: "/test-covers/ghost-tax.webp",
    isComplete: false,
    published: false,
    startDaysAgo: 15,
    everyDays: 1,
  },
];

/** Ghost Tax's single episode stays a saved draft, last edited this many days ago. */
export const DRAFT_LAST_SAVED_DAYS_AGO = 2;

/* ---------------------------------------------------------------- activity */

/** Reads: episodes 1..`upTo` of a series; the last one is in progress at `lastPercent`. */
export type ReadPlan = { who: AccountKey; series: SeriesKey; upTo: number; lastPercent: number };

export const READS: ReadPlan[] = [
  { who: "R1", series: "salt-crown", upTo: 8, lastPercent: 100 },
  { who: "R1", series: "tidecaller", upTo: 3, lastPercent: 40 },
  { who: "R1", series: "quiet-ration", upTo: 1, lastPercent: 100 },
  { who: "R2", series: "ninth-floor-alibi", upTo: 5, lastPercent: 60 },
  { who: "R2", series: "zero-hour-courier", upTo: 2, lastPercent: 100 },
  { who: "R2", series: "what-the-fog-keeps", upTo: 2, lastPercent: 100 },
  { who: "R3", series: "orbit-nine", upTo: 8, lastPercent: 30 },
  { who: "R3", series: "quiet-ration", upTo: 1, lastPercent: 100 },
  { who: "R3", series: "salt-crown", upTo: 2, lastPercent: 100 },
  { who: "R4", series: "lighthouse-letters", upTo: 6, lastPercent: 100 },
  { who: "R4", series: "cartographers-daughter", upTo: 3, lastPercent: 50 },
  { who: "R4", series: "seventeen-minutes-late", upTo: 2, lastPercent: 100 },
  { who: "R5", series: "what-the-fog-keeps", upTo: 4, lastPercent: 100 },
  { who: "R5", series: "zero-hour-courier", upTo: 3, lastPercent: 100 },
  { who: "R5", series: "ninth-floor-alibi", upTo: 2, lastPercent: 100 },
  { who: "R6", series: "night-shift-mabels", upTo: 10, lastPercent: 100 },
  { who: "R6", series: "seventeen-minutes-late", upTo: 4, lastPercent: 70 },
  { who: "R6", series: "lighthouse-letters", upTo: 2, lastPercent: 100 },
  { who: "R7", series: "salt-crown", upTo: 4, lastPercent: 100 },
  { who: "R7", series: "orbit-nine", upTo: 3, lastPercent: 100 },
  { who: "R7", series: "ninth-floor-alibi", upTo: 2, lastPercent: 100 },
  { who: "R7", series: "night-shift-mabels", upTo: 5, lastPercent: 45 },
  { who: "R7", series: "lighthouse-letters", upTo: 3, lastPercent: 100 },
  { who: "R8", series: "salt-crown", upTo: 1, lastPercent: 20 },
  { who: "B", series: "salt-crown", upTo: 3, lastPercent: 100 },
  { who: "D", series: "salt-crown", upTo: 2, lastPercent: 100 },
  { who: "A", series: "zero-hour-courier", upTo: 2, lastPercent: 100 },
  { who: "A", series: "tidecaller", upTo: 2, lastPercent: 100 },
  { who: "E", series: "cartographers-daughter", upTo: 2, lastPercent: 100 },
  { who: "E", series: "night-shift-mabels", upTo: 2, lastPercent: 100 },
];

/**
 * Ratings (1-5, on an episode the rater has read; never the rater's own
 * series). Pooled per series:
 *   The Salt Crown 4.7 (7, top), Zero Hour Courier 2.0 (4, low),
 *   Orbit Nine 4.3 (3), Ninth Floor 4.3 (4), Letters 4.3 (3),
 *   Cartographer 4.3 (3), Mabel's 4.0 (3), Tidecaller 3.7 (3),
 *   What the Fog Keeps (2, hidden), Seventeen (2, hidden), Quiet Ration (1, hidden).
 */
export const RATINGS: { who: AccountKey; series: SeriesKey; episode: number; value: number }[] = [
  { who: "R1", series: "salt-crown", episode: 1, value: 5 },
  { who: "R1", series: "salt-crown", episode: 2, value: 5 },
  { who: "R3", series: "salt-crown", episode: 1, value: 5 },
  { who: "R7", series: "salt-crown", episode: 1, value: 4 },
  { who: "R7", series: "salt-crown", episode: 3, value: 5 },
  { who: "B", series: "salt-crown", episode: 1, value: 5 },
  { who: "D", series: "salt-crown", episode: 1, value: 4 },
  { who: "R2", series: "zero-hour-courier", episode: 1, value: 2 },
  { who: "R2", series: "zero-hour-courier", episode: 2, value: 2 },
  { who: "R5", series: "zero-hour-courier", episode: 1, value: 2 },
  { who: "A", series: "zero-hour-courier", episode: 1, value: 2 },
  { who: "R3", series: "orbit-nine", episode: 1, value: 5 },
  { who: "R3", series: "orbit-nine", episode: 2, value: 4 },
  { who: "R7", series: "orbit-nine", episode: 1, value: 4 },
  { who: "R2", series: "ninth-floor-alibi", episode: 1, value: 5 },
  { who: "R2", series: "ninth-floor-alibi", episode: 2, value: 4 },
  { who: "R5", series: "ninth-floor-alibi", episode: 1, value: 4 },
  { who: "R7", series: "ninth-floor-alibi", episode: 1, value: 4 },
  { who: "R4", series: "lighthouse-letters", episode: 1, value: 5 },
  { who: "R6", series: "lighthouse-letters", episode: 1, value: 4 },
  { who: "R7", series: "lighthouse-letters", episode: 2, value: 4 },
  { who: "R4", series: "cartographers-daughter", episode: 1, value: 4 },
  { who: "R4", series: "cartographers-daughter", episode: 2, value: 5 },
  { who: "E", series: "cartographers-daughter", episode: 1, value: 4 },
  { who: "R6", series: "night-shift-mabels", episode: 1, value: 5 },
  { who: "R7", series: "night-shift-mabels", episode: 2, value: 3 },
  { who: "E", series: "night-shift-mabels", episode: 1, value: 4 },
  { who: "R1", series: "tidecaller", episode: 1, value: 4 },
  { who: "R1", series: "tidecaller", episode: 2, value: 3 },
  { who: "A", series: "tidecaller", episode: 1, value: 4 },
  { who: "R5", series: "what-the-fog-keeps", episode: 1, value: 4 },
  { who: "R2", series: "what-the-fog-keeps", episode: 1, value: 3 },
  { who: "R6", series: "seventeen-minutes-late", episode: 1, value: 4 },
  { who: "R4", series: "seventeen-minutes-late", episode: 1, value: 3 },
  { who: "R3", series: "quiet-ration", episode: 1, value: 4 },
];

export const BOOKMARKS: { who: AccountKey; series: SeriesKey; episode: number }[] = [
  { who: "R1", series: "salt-crown", episode: 3 },
  { who: "R1", series: "tidecaller", episode: 2 },
  { who: "R2", series: "ninth-floor-alibi", episode: 4 },
  { who: "R3", series: "orbit-nine", episode: 7 },
  { who: "R4", series: "lighthouse-letters", episode: 2 },
  { who: "R4", series: "cartographers-daughter", episode: 1 },
  { who: "R5", series: "what-the-fog-keeps", episode: 2 },
  { who: "R6", series: "night-shift-mabels", episode: 5 },
  { who: "R7", series: "salt-crown", episode: 1 },
  { who: "R7", series: "ninth-floor-alibi", episode: 1 },
];

export const FOLLOWS: { who: AccountKey; series: SeriesKey }[] = [
  { who: "R1", series: "salt-crown" },
  { who: "R1", series: "tidecaller" },
  { who: "R2", series: "ninth-floor-alibi" },
  { who: "R2", series: "zero-hour-courier" },
  { who: "R3", series: "orbit-nine" },
  { who: "R3", series: "quiet-ration" },
  { who: "R4", series: "lighthouse-letters" },
  { who: "R4", series: "cartographers-daughter" },
  { who: "R5", series: "what-the-fog-keeps" },
  { who: "R5", series: "zero-hour-courier" },
  { who: "R6", series: "night-shift-mabels" },
  { who: "R6", series: "seventeen-minutes-late" },
  { who: "R7", series: "salt-crown" },
  { who: "R7", series: "orbit-nine" },
  { who: "R7", series: "night-shift-mabels" },
  { who: "B", series: "salt-crown" },
];

/** Plain-text comments; `hoursAfter` = hours after the episode was published. */
export const COMMENTS: { who: AccountKey; series: SeriesKey; episode: number; hoursAfter: number; body: string }[] = [
  { who: "R1", series: "salt-crown", episode: 1, hoursAfter: 3, body: "The crown choosing Isla while she still smells of herring is the best opening I've read in ages." },
  { who: "R7", series: "salt-crown", episode: 1, hoursAfter: 20, body: "Grandmother Brack is my favourite character already. That line about the sea keeping receipts!" },
  { who: "B", series: "salt-crown", episode: 1, hoursAfter: 30, body: "Lovely salt-and-stone atmosphere. Following." },
  { who: "R2", series: "ninth-floor-alibi", episode: 1, hoursAfter: 5, body: "I counted the coffee cups twice. Quell is going to make me paranoid about every meeting now." },
  { who: "R5", series: "ninth-floor-alibi", episode: 1, hoursAfter: 26, body: "My money is on the facilities manager. Nobody is that calm about a missing key card." },
  { who: "R4", series: "lighthouse-letters", episode: 2, hoursAfter: 8, body: "The postscript about the gull who steals her pencils made me laugh out loud." },
  { who: "R6", series: "lighthouse-letters", episode: 2, hoursAfter: 40, body: "Slow burn done right. I'd read a whole book of just these letters." },
  { who: "R6", series: "night-shift-mabels", episode: 1, hoursAfter: 2, body: "Gus refusing to make a 'deconstructed' anything is my whole personality." },
  { who: "R7", series: "night-shift-mabels", episode: 1, hoursAfter: 15, body: "Cosy and funny. The rain at the window felt real." },
  { who: "E", series: "night-shift-mabels", episode: 1, hoursAfter: 31, body: "The pie argument. Perfect." },
  { who: "R3", series: "orbit-nine", episode: 1, hoursAfter: 6, body: "A dead planet that starts sending messages is such a good hook. Answer it! Don't answer it!" },
  { who: "R7", series: "orbit-nine", episode: 1, hoursAfter: 50, body: "Commander Osei is wonderfully calm. I trust her completely, which probably means I shouldn't." },
];

/** Writer A's Writing view sections (Sweep 14), so the profile isn't empty. */
export const WRITER_A_PROFILE = {
  books: [
    {
      title: "Salt and Stone: Stories",
      note: "A short collection set on Merrow Isle, before the crown chose anyone.",
      url: "https://example.com/salt-and-stone",
    },
  ],
  seriesInLibrary: ["salt-crown", "orbit-nine"] as SeriesKey[],
  about: [
    {
      prompt: "What made you start writing?",
      answer: "A storm took out the power for three days when I was eleven. I wrote a map of an island by candlelight and have been filling it in ever since.",
    },
    { prompt: "Where and when I write best", answer: "Early, before anyone can ask me a question. Kitchen table, window open, tea going cold." },
  ],
  links: [
    { label: "Newsletter", url: "https://example.com/newsletter", subtext: "Monthly notes from Merrow Isle" },
    { label: "Website", url: "https://example.com", subtext: null },
  ],
};
