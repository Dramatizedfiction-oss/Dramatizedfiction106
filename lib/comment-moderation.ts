/*
 * The one place comment and note text will be screened before it's saved
 * (Sweep I; like lib/profile-moderation.ts for profiles and
 * lib/store/screening.ts for Store images). Automated text screening doesn't
 * exist yet, so everything passes today; comments are already plain text,
 * length-checked, rate-limited, reportable and removable. When screening
 * exists, check `text` here and refuse with `message`.
 */
export async function screenCommentText(_text: string): Promise<{ ok: true } | { ok: false; message: string }> {
  return { ok: true };
}
