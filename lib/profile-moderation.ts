import type { NormalizedAuthorProfile } from "@/lib/author-profile-rules";

/*
 * The one place profile content will be screened before it is saved (Sweep 8
 * moderation). Automated text, link and image scanning doesn't exist yet, so
 * everything passes today. When it does, check here: the bio, book titles and
 * notes, About questions and answers, link names, subtext and URLs, and the
 * book cover URLs (uploaded images). PUT /api/me/author-profile calls this
 * with the cleaned document and refuses the save with `message` when it fails.
 *
 * Reporting a profile (or one card or link on it) doesn't exist either; it
 * would go next to the comment and AI-tag reports in Administration > Reports.
 */
export async function screenProfileContent(
  _userId: string,
  _profile: NormalizedAuthorProfile,
): Promise<{ ok: true } | { ok: false; message: string }> {
  return { ok: true };
}
