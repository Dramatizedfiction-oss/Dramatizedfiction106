import { normalizeProfileLink, safeProfileLink } from "@/lib/profile";

/*
 * Rules for the Writing view of a writer's profile (Sweep 14): limits, the
 * starter prompts, text and link checks, the link icon lookup, and
 * normalizeAuthorProfile(), which the editor runs for early feedback and
 * PUT /api/me/author-profile runs again as the real check. Client-safe, pure.
 *
 * Section order on the page: Bio, Library, Author area, On site, Links. A
 * section shows to visitors only when its switch is on and it has content.
 */

export const AUTHOR_PROFILE_LIMITS = {
  bio: 300,
  libraryItems: 12,
  bookTitle: 100,
  bookNote: 120,
  aboutCards: 10,
  prompt: 120,
  answer: 300,
  links: 10,
  linkLabel: 40,
  linkSubtext: 80,
  url: 300,
} as const;

/** "Show 3, then See all" for both parts of On site. */
export const ON_SITE_PREVIEW = 3;
/** Page size of /author/[id]/works. */
export const WORKS_PAGE_SIZE = 20;

export const STARTER_PROMPTS = [
  "What made you start writing?",
  "My favorite book series",
  "Authors who inspire me",
  "Where and when I write best",
  "A story I can't stop thinking about",
  "What I'm working on next",
  "What I listen to while writing",
  "Something readers might not know about me",
] as const;

export type SectionKey = "bio" | "library" | "about" | "onSite" | "links";
export type SectionSwitches = Record<SectionKey, boolean>;
export const ALL_SECTIONS_ON: SectionSwitches = { bio: true, library: true, about: true, onSite: true, links: true };

export type LibraryInput =
  | { id?: string; kind: "BOOK"; title: string; note: string; url: string; coverImage: string }
  | { id?: string; kind: "SERIES"; seriesId: string };
export type AboutInput = { id?: string; prompt: string; answer: string };
export type LinkInput = { id?: string; label: string; url: string; subtext: string };

export type AuthorProfileInput = {
  bio: string;
  sections: SectionSwitches;
  library: LibraryInput[];
  about: AboutInput[];
  links: LinkInput[];
};

export type NormalizedLibrary =
  | { id?: string; kind: "BOOK"; title: string; note: string | null; url: string | null; coverImage: string | null }
  | { id?: string; kind: "SERIES"; seriesId: string };
export type NormalizedAuthorProfile = {
  bio: string | null;
  sections: SectionSwitches;
  library: NormalizedLibrary[];
  about: { id?: string; prompt: string; answer: string }[];
  links: { id?: string; label: string; url: string; subtext: string | null }[];
};

// Control characters except tab and line breaks.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g;

/** One-line text: control characters removed, whitespace collapsed, trimmed. */
export function cleanLine(value: string | null | undefined) {
  return (value ?? "").replace(CONTROL, "").replace(/\s+/g, " ").trim();
}

/** Multi-line plain text: at most one blank line between paragraphs, no trailing spaces. */
export function cleanParagraphs(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Web addresses written into text (the bio takes no links). */
export function containsLink(text: string) {
  return /\bhttps?:\/\/|\bwww\.[a-z0-9-]+\./i.test(text);
}

/** Bio check shared by every profile (reading and author). */
export function checkBio(value: string | null | undefined): { ok: true; value: string | null } | { ok: false; message: string } {
  const bio = cleanParagraphs(value);
  if (bio.length > AUTHOR_PROFILE_LIMITS.bio) return { ok: false, message: `Bios can be up to ${AUTHOR_PROFILE_LIMITS.bio} characters.` };
  if (containsLink(bio)) return { ok: false, message: "Links can't go in your bio. Add them in the Links section instead." };
  return { ok: true, value: bio || null };
}

/** The domain shown under a link so readers can see where it goes ("amazon.com"). */
export function linkDomain(url: string | null | undefined) {
  const safe = safeProfileLink(url);
  if (!safe) return null;
  return new URL(safe).hostname.replace(/^www\./, "").toLowerCase();
}

export type LinkIconKey =
  | "amazon" | "instagram" | "tiktok" | "x" | "patreon" | "youtube" | "kofi" | "substack" | "discord"
  | "facebook" | "threads" | "bluesky" | "goodreads" | "wattpad" | "royalroad" | "reddit" | "twitch"
  | "spotify" | "book" | "link";

/** Known sites by domain (the domain itself or any subdomain of it). */
const ICON_DOMAINS: [LinkIconKey, string[]][] = [
  ["amazon", ["amazon.com", "amazon.co.uk", "amazon.ca", "amazon.com.au", "amazon.de", "amazon.fr", "amazon.es", "amazon.it", "amazon.in", "amazon.co.jp", "amzn.to", "a.co", "audible.com"]],
  ["instagram", ["instagram.com", "instagr.am"]],
  ["tiktok", ["tiktok.com"]],
  ["x", ["x.com", "twitter.com"]],
  ["patreon", ["patreon.com"]],
  ["youtube", ["youtube.com", "youtu.be"]],
  ["kofi", ["ko-fi.com"]],
  ["substack", ["substack.com"]],
  ["discord", ["discord.gg", "discord.com"]],
  ["facebook", ["facebook.com", "fb.com", "fb.me"]],
  ["threads", ["threads.net", "threads.com"]],
  ["bluesky", ["bsky.app"]],
  ["goodreads", ["goodreads.com"]],
  ["wattpad", ["wattpad.com"]],
  ["royalroad", ["royalroad.com"]],
  ["reddit", ["reddit.com", "redd.it"]],
  ["twitch", ["twitch.tv"]],
  ["spotify", ["spotify.com"]],
  ["book", ["books.apple.com", "kobo.com", "barnesandnoble.com", "bookbub.com", "bookshop.org"]],
];

export const KNOWN_LINK_SITES: Record<Exclude<LinkIconKey, "link" | "book">, string> = {
  amazon: "Amazon", instagram: "Instagram", tiktok: "TikTok", x: "X", patreon: "Patreon", youtube: "YouTube",
  kofi: "Ko-fi", substack: "Substack", discord: "Discord", facebook: "Facebook", threads: "Threads",
  bluesky: "Bluesky", goodreads: "Goodreads", wattpad: "Wattpad", royalroad: "Royal Road", reddit: "Reddit",
  twitch: "Twitch", spotify: "Spotify",
};

/** The icon for a link, from its domain; a generic link icon otherwise. */
export function linkIcon(url: string | null | undefined): LinkIconKey {
  const domain = linkDomain(url);
  if (!domain) return "link";
  for (const [key, domains] of ICON_DOMAINS) {
    if (domains.some((known) => domain === known || domain.endsWith(`.${known}`))) return key;
  }
  return "link";
}

type Problem = { ok: false; message: string };
const problem = (message: string): Problem => ({ ok: false, message });

function requiredLine(value: string, max: number, missing: string, name: string): { ok: true; value: string } | Problem {
  const text = cleanLine(value);
  if (!text) return problem(missing);
  if (text.length > max) return problem(`${name} can be up to ${max} characters.`);
  return { ok: true, value: text };
}

function optionalLine(value: string, max: number, what: string): { ok: true; value: string | null } | Problem {
  const text = cleanLine(value);
  if (text.length > max) return problem(`${what} can be up to ${max} characters.`);
  return { ok: true, value: text || null };
}

function link(value: string, required: boolean): { ok: true; value: string | null } | Problem {
  const result = normalizeProfileLink(value);
  if (!result.ok) return problem(result.message);
  if (required && !result.value) return problem("add a web address.");
  return result;
}

/**
 * Validates and cleans the whole editor document. Limits, required fields and
 * URL schemes are checked here; ownership (series, existing ids, uploaded
 * images) is checked by the server in lib/author-profile.ts.
 */
export function normalizeAuthorProfile(input: AuthorProfileInput): { ok: true; value: NormalizedAuthorProfile } | Problem {
  const bio = checkBio(input.bio);
  if (!bio.ok) return problem(`Bio: ${bio.message}`);

  if (input.library.length > AUTHOR_PROFILE_LIMITS.libraryItems) return problem(`Your Library can hold up to ${AUTHOR_PROFILE_LIMITS.libraryItems} cards.`);
  if (input.about.length > AUTHOR_PROFILE_LIMITS.aboutCards) return problem(`About me can hold up to ${AUTHOR_PROFILE_LIMITS.aboutCards} cards.`);
  if (input.links.length > AUTHOR_PROFILE_LIMITS.links) return problem(`You can add up to ${AUTHOR_PROFILE_LIMITS.links} links.`);

  const library: NormalizedLibrary[] = [];
  const seenSeries = new Set<string>();
  for (const [index, item] of input.library.entries()) {
    const where = `Library card ${index + 1}`;
    if (item.kind === "SERIES") {
      if (!item.seriesId) return problem(`${where}: choose a series.`);
      if (seenSeries.has(item.seriesId)) return problem(`${where}: that series is already in your Library.`);
      seenSeries.add(item.seriesId);
      library.push({ id: item.id, kind: "SERIES", seriesId: item.seriesId });
      continue;
    }
    const title = requiredLine(item.title, AUTHOR_PROFILE_LIMITS.bookTitle, "add a title.", "Titles");
    if (!title.ok) return problem(`${where}: ${title.message}`);
    const note = optionalLine(item.note, AUTHOR_PROFILE_LIMITS.bookNote, "The note");
    if (!note.ok) return problem(`${where}: ${note.message}`);
    const url = link(item.url, false);
    if (!url.ok) return problem(`${where}: ${url.message}`);
    library.push({ id: item.id, kind: "BOOK", title: title.value, note: note.value, url: url.value, coverImage: item.coverImage?.trim() || null });
  }

  const about: NormalizedAuthorProfile["about"] = [];
  for (const [index, card] of input.about.entries()) {
    const where = `About card ${index + 1}`;
    const prompt = requiredLine(card.prompt, AUTHOR_PROFILE_LIMITS.prompt, "add a question.", "Questions");
    if (!prompt.ok) return problem(`${where}: ${prompt.message}`);
    const answer = cleanParagraphs(card.answer);
    if (!answer) return problem(`${where}: add your answer.`);
    if (answer.length > AUTHOR_PROFILE_LIMITS.answer) return problem(`${where}: answers can be up to ${AUTHOR_PROFILE_LIMITS.answer} characters.`);
    about.push({ id: card.id, prompt: prompt.value, answer });
  }

  const links: NormalizedAuthorProfile["links"] = [];
  for (const [index, item] of input.links.entries()) {
    const where = `Link ${index + 1}`;
    const label = requiredLine(item.label, AUTHOR_PROFILE_LIMITS.linkLabel, "add a name.", "Link names");
    if (!label.ok) return problem(`${where}: ${label.message}`);
    const url = link(item.url, true);
    if (!url.ok) return problem(`${where}: ${url.message}`);
    const subtext = optionalLine(item.subtext, AUTHOR_PROFILE_LIMITS.linkSubtext, "The text above the link");
    if (!subtext.ok) return problem(`${where}: ${subtext.message}`);
    links.push({ id: item.id, label: label.value, url: url.value!, subtext: subtext.value });
  }

  return { ok: true, value: { bio: bio.value, sections: { ...input.sections }, library, about, links } };
}

/* ---- Display data shared by the page (server) and the editor preview (client). ---- */

export type RatingSummary = { value: string; count: number; text: string; label: string } | null;

/** One of the writer's own series as a Library card shows it. */
export type SeriesCardInfo = {
  id: string;
  title: string;
  coverImage: string | null;
  themeColor: string | null;
  aiUsageTag: string;
  rating: RatingSummary;
  published: boolean;
};

export type LibraryCardData =
  | { key: string; kind: "BOOK"; title: string; note: string | null; url: string | null; coverImage: string | null }
  | { key: string; kind: "SERIES"; series: SeriesCardInfo };
export type AboutCardData = { key: string; prompt: string; answer: string };
export type LinkData = { key: string; label: string; url: string; subtext: string | null };

export type OnSiteSeries = { id: string; title: string; coverImage: string | null; themeColor: string | null; aiUsageTag: string; episodeCount: number };
export type OnSiteEpisode = { id: string; title: string; episodeNumber: number; aiUsageTag: string; seriesTitle: string; coverImage: string | null };
export type OnSiteData = { series: OnSiteSeries[]; seriesTotal: number; episodes: OnSiteEpisode[]; episodesTotal: number };

/** Whether a section appears for visitors: switched on and not empty. */
export function sectionVisible(on: boolean, itemCount: number) {
  return on && itemCount > 0;
}
