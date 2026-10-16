import { legalBodyToMarkdown } from "@/lib/content/legal-markdown";
import { safeHref } from "@/lib/content/markdown";
import { LEGAL_DOCUMENTS, type LegalSlug } from "@/lib/legal";
import { LEGAL_PLACEHOLDERS } from "@/lib/legal/placeholders";

/*
 * EVERY ITEM IN ADMINISTRATION › CONTENT (Sweep B3). Client-safe and pure.
 *
 * Each item has a key, a section, the fields its editor shows, and built-in
 * defaults: today's text, which the live site falls back to whenever an item
 * is missing, invalid, or the database can't be read (lib/content/read.ts).
 * Stored values live in ContentItem (current) and ContentRevision (history).
 *
 * To make more text editable: add an item here, read it on its page with
 * getContent(key), and keep the old text as `defaults`.
 */

export type FieldKind = "text" | "markdown" | "boolean" | "link";

export type FieldDef = {
  name: string;
  label: string;
  kind: FieldKind;
  /** Longest allowed value (characters). */
  max: number;
  required?: boolean;
  hint?: string;
};

export type ContentValues = Record<string, string | boolean>;

export type ContentSection = "articles" | "legal" | "site";

export type ContentDef = {
  key: string;
  section: ContentSection;
  label: string;
  description: string;
  /** Where the item shows on the site (for the editor's "Shown on" line and preview links). */
  usedOn: { label: string; href: string }[];
  fields: FieldDef[];
  defaults: ContentValues;
  /** How the editor previews it. "document": title + Markdown body split at ## headings. */
  preview: "document" | "article" | "fields" | "banner";
};

export const CONTENT_SECTIONS: { id: ContentSection; label: string; description: string }[] = [
  { id: "articles", label: "Articles", description: "Longer pages: writer onboarding, About and AI Usage." },
  { id: "legal", label: "Legal", description: "The six legal pages and the values that fill their placeholders." },
  { id: "site", label: "Site copy", description: "Short text around the site, and the announcement banner." },
];

const WRITER_ONBOARDING: ContentDef = {
  key: "article.writer-onboarding",
  section: "articles",
  label: "Writer onboarding",
  description: "The Write With Us page and the Writer Studio guidelines.",
  usedOn: [
    { label: "Write With Us", href: "/write-with-us" },
    { label: "Writer Studio › Guidelines", href: "/writer-studio/guidelines" },
  ],
  fields: [
    { name: "title", label: "Title", kind: "text", max: 300, required: true },
    { name: "quick", label: "Quick overview", kind: "markdown", max: 10_000, required: true },
    { name: "deep", label: "Deeper understanding", kind: "markdown", max: 20_000, required: true },
  ],
  defaults: {
    title: "Start Writing With Us",
    quick:
      "Dramatized Fiction is built for serialized storytellers who want their work to feel premium, alive, and easy to follow. Writers can publish series, release episodes, and build an audience inside a story-first platform.",
    deep:
      "Writers who join Dramatized Fiction are stepping into a platform designed around long-form worlds, episode flow, and reader retention. This deeper section can explain expectations, editorial standards, release rhythm, and what support the platform offers as it grows.",
  },
  preview: "article",
};

function pageDef(key: string, label: string, href: string, defaults: { title: string; intro: string; body: string }): ContentDef {
  return {
    key,
    section: "articles",
    label,
    description: `The ${label} page. Each "## Heading" in the body becomes a card.`,
    usedOn: [{ label, href }],
    fields: [
      { name: "title", label: "Title", kind: "text", max: 160, required: true },
      { name: "intro", label: "Introduction", kind: "markdown", max: 3_000 },
      { name: "body", label: "Cards", kind: "markdown", max: 20_000, hint: "Start each card with a line like ## Readers." },
    ],
    defaults,
    preview: "document",
  };
}

const ABOUT = pageDef("page.about", "About", "/about", {
  title: "A fiction platform with cinematic presence",
  intro:
    "Dramatized Fiction is built to make serialized written stories feel premium, performative, and immersive. The product direction blends polished SaaS structure with editorial storytelling surfaces.",
  body: [
    "## Readers",
    "Browse, discover, and read serialized fiction with a cleaner, more atmospheric experience.",
    "## Creators",
    "Publish stories, manage episodes, and grow worlds through an intentional author workflow.",
  ].join("\n\n"),
});

const AI_USAGE = pageDef("page.ai-usage", "AI Usage", "/ai-usage", {
  title: "How AI fits into the platform",
  intro:
    "AI is used as a support layer for platform building and workflow assistance, not as a replacement for creator voice. This page exists as a permanent sidebar destination, not a modal, so policy and transparency can expand over time.",
  body: [
    "## Platform assistance",
    "AI may help with drafting interface copy, organizing workflows, and supporting internal tooling.",
    "## Creator authorship",
    "The creative identity of published work should stay grounded in the author, with AI treated as assistive rather than authoritative.",
  ].join("\n\n"),
});

function legalDef(slug: LegalSlug): ContentDef {
  const document = LEGAL_DOCUMENTS[slug];
  return {
    key: `legal.${slug}`,
    section: "legal",
    label: document.shortTitle,
    description: `${document.title}. Each "## Heading" is a section. [PLACEHOLDERS] are filled from Legal placeholders.`,
    usedOn: [{ label: document.shortTitle, href: `/${slug}` }],
    fields: [
      { name: "title", label: "Title", kind: "text", max: 200, required: true },
      { name: "body", label: "Text", kind: "markdown", max: 100_000, required: true },
    ],
    defaults: { title: document.title, body: legalBodyToMarkdown(document) },
    preview: "document",
  };
}

export const LEGAL_PLACEHOLDER_KEYS = Object.keys(LEGAL_PLACEHOLDERS);

/** Field names for the placeholder item ("CONTACT EMAIL" -> "contactEmail"). */
export function placeholderField(key: string) {
  return key.toLowerCase().replace(/ (\w)/g, (_, letter: string) => letter.toUpperCase());
}

const LEGAL_PLACEHOLDER_ITEM: ContentDef = {
  key: "legal.placeholders",
  section: "legal",
  label: "Legal placeholders",
  description: "The values that replace [PLACEHOLDERS] on every legal page. Leave one empty and it shows as written.",
  usedOn: [{ label: "Terms", href: "/terms" }],
  fields: LEGAL_PLACEHOLDER_KEYS.map((key) => ({
    name: placeholderField(key),
    label: key.charAt(0) + key.slice(1).toLowerCase(),
    kind: "text" as const,
    max: 300,
    hint: `Replaces [${key}]`,
  })),
  defaults: Object.fromEntries(LEGAL_PLACEHOLDER_KEYS.map((key) => [placeholderField(key), LEGAL_PLACEHOLDERS[key] ?? ""])),
  preview: "fields",
};

const FOOTER: ContentDef = {
  key: "copy.footer",
  section: "site",
  label: "Footer",
  description: "The line under the site name in the footer.",
  usedOn: [{ label: "Every page", href: "/" }],
  fields: [{ name: "tagline", label: "Tagline", kind: "text", max: 80, hint: "Leave empty to hide it." }],
  defaults: { tagline: "Stories performed in text" },
  preview: "fields",
};

const HOME: ContentDef = {
  key: "copy.home",
  section: "site",
  label: "Home page",
  description: "The sign-up button under the wordmark (signed-out visitors) and the Featured heading.",
  usedOn: [{ label: "Home", href: "/" }],
  fields: [
    { name: "joinButton", label: "Sign-up button", kind: "text", max: 40, required: true },
    { name: "featuredHeading", label: "Featured heading", kind: "text", max: 60, required: true },
  ],
  defaults: { joinButton: "Join the Story", featuredHeading: "Featured Stories" },
  preview: "fields",
};

const BANNER: ContentDef = {
  key: "site.announcement",
  section: "site",
  label: "Announcement banner",
  description: "A short message across the top of every page. Members can dismiss it; a new message shows again.",
  usedOn: [{ label: "Every page", href: "/" }],
  fields: [
    { name: "enabled", label: "Show the banner", kind: "boolean", max: 0 },
    { name: "text", label: "Message", kind: "text", max: 160 },
    { name: "linkLabel", label: "Link text", kind: "text", max: 40, hint: "Optional." },
    { name: "linkHref", label: "Link", kind: "link", max: 500, hint: "Optional. A page on this site (/explore) or a full https:// address." },
  ],
  defaults: { enabled: false, text: "", linkLabel: "", linkHref: "" },
  preview: "banner",
};

export const CONTENT_DEFS: ContentDef[] = [
  WRITER_ONBOARDING,
  ABOUT,
  AI_USAGE,
  ...(Object.keys(LEGAL_DOCUMENTS) as LegalSlug[]).map(legalDef),
  LEGAL_PLACEHOLDER_ITEM,
  BANNER,
  HOME,
  FOOTER,
];

const BY_KEY = new Map(CONTENT_DEFS.map((def) => [def.key, def]));

export function getContentDef(key: string): ContentDef | null {
  return BY_KEY.get(key) ?? null;
}

/* -------------------------------------------------------------- validation */

// Control characters except tab and newline.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export type ContentCheck = { ok: true; values: ContentValues } | { ok: false; field?: string; message: string };

/**
 * Checks a whole item against its fields: every field present with the right
 * type, within its length, required ones filled, links safe; no other keys.
 * Text is normalized (line endings, control characters, outer whitespace).
 */
export function validateContent(def: ContentDef, data: unknown): ContentCheck {
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, message: "Invalid content." };
  const input = data as Record<string, unknown>;
  const allowed = new Set(def.fields.map((field) => field.name));
  const unknown = Object.keys(input).find((name) => !allowed.has(name));
  if (unknown) return { ok: false, message: `Unknown field "${unknown.slice(0, 40)}".` };

  const values: ContentValues = {};
  for (const field of def.fields) {
    const raw = input[field.name];
    if (field.kind === "boolean") {
      if (typeof raw !== "boolean") return { ok: false, field: field.name, message: `${field.label}: choose on or off.` };
      values[field.name] = raw;
      continue;
    }
    if (typeof raw !== "string") return { ok: false, field: field.name, message: `${field.label} is missing.` };
    let text = raw.replace(/\r\n?/g, "\n").replace(CONTROL_CHARS, "").trim();
    if (field.kind !== "markdown") text = text.replace(/\s*\n\s*/g, " ");
    if (field.required && !text) return { ok: false, field: field.name, message: `${field.label} can't be empty.` };
    if (text.length > field.max) {
      return { ok: false, field: field.name, message: `${field.label} can be up to ${field.max.toLocaleString("en-US")} characters.` };
    }
    if (field.kind === "link" && text && !safeHref(text)) {
      return { ok: false, field: field.name, message: `${field.label}: use a page on this site (/explore) or a full https:// address.` };
    }
    values[field.name] = text;
  }

  if (def.preview === "banner" && values.enabled === true && !values.text) {
    return { ok: false, field: "text", message: "Write a message before turning the banner on." };
  }
  if (def.preview === "banner" && Boolean(values.linkLabel) !== Boolean(values.linkHref)) {
    return { ok: false, field: values.linkLabel ? "linkHref" : "linkLabel", message: "A link needs both its text and its address." };
  }
  return { ok: true, values };
}
