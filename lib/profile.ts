/*
 * Profile field rules shared by Settings (client) and PATCH /api/me/profile
 * (server, which enforces them). Client-safe.
 */

export const PROFILE_LIMITS = {
  // Matches the limit used when becoming a writer (app/api/become-author).
  name: 80,
  bio: 600,
  link: 300,
} as const;

export const PROFILE_LINK_FIELDS = [
  { key: "websiteUrl", label: "Website", placeholder: "https://your-site.com" },
  { key: "twitterUrl", label: "X / Twitter", placeholder: "https://x.com/yourname" },
  { key: "instagramUrl", label: "Instagram", placeholder: "https://instagram.com/yourname" },
  { key: "youtubeUrl", label: "YouTube", placeholder: "https://youtube.com/@yourname" },
  { key: "discordUrl", label: "Discord", placeholder: "https://discord.gg/invite" },
] as const;

export type ProfileLinkKey = (typeof PROFILE_LINK_FIELDS)[number]["key"];

/**
 * Empty -> null. Otherwise it must be an http(s) web address; "https://" is
 * added when the scheme is missing. Anything else (javascript:, mailto:, ...)
 * is rejected.
 */
export function normalizeProfileLink(
  value: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; message: string } {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > PROFILE_LIMITS.link) return { ok: false, message: "That link is too long." };

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname.includes(".")) {
      return { ok: false, message: "Enter a web address starting with https://" };
    }
    return { ok: true, value: url.toString() };
  } catch {
    return { ok: false, message: "Enter a web address starting with https://" };
  }
}

/** For rendering stored links: only http(s) addresses become clickable. */
export function safeProfileLink(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
