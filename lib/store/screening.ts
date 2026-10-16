/*
 * The one place Store images will be screened before they're added (like
 * lib/profile-moderation.ts for profiles). Automated image scanning doesn't
 * exist yet, so everything passes today; uploads are already limited to
 * Board and CEO and re-encoded by the image pipeline. When scanning exists,
 * check `url` here and refuse with `message`.
 */
export async function screenStoreImage(_url: string): Promise<{ ok: true } | { ok: false; message: string }> {
  return { ok: true };
}
