// Client-safe. Every series or episode cover uploaded since Sweep 13 also has a
// 480px-wide copy stored next to it, named "<same name>-480.webp". Cards and
// rails show that small copy; the hero shows the full cover. The name is
// derived, so no database column is needed; older covers without a small copy
// fall back to the full image (components/series/CoverImage.tsx).

export const COVER_THUMB_WIDTH = 480;
const THUMBED = /^\/images\/(series-cover|episode-cover)\/[^/]+\.webp$/;

/** The small copy's URL for an uploaded cover, or null (external/legacy URLs). */
export function coverThumbUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !THUMBED.test(parsed.pathname) || parsed.pathname.endsWith(`-${COVER_THUMB_WIDTH}.webp`)) {
      return null;
    }
    parsed.pathname = parsed.pathname.replace(/\.webp$/, `-${COVER_THUMB_WIDTH}.webp`);
    return parsed.toString();
  } catch {
    return null;
  }
}
