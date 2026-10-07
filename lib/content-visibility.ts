import type { Prisma } from "@prisma/client";

/*
 * Public (reader-facing) visibility rules. Writer Studio and other
 * owner-scoped tools do not use these; they query by authorId instead.
 */

/** A series readers may see. */
export const PUBLIC_SERIES_WHERE = {
  status: "PUBLISHED",
} satisfies Prisma.SeriesWhereInput;

/** An episode readers may see: published, inside a published series. */
export const PUBLIC_EPISODE_WHERE = {
  status: "PUBLISHED",
  series: { status: "PUBLISHED" },
} satisfies Prisma.EpisodeWhereInput;

const EXCERPT_WORDS = 24;

/**
 * Card preview text for an episode listing, computed on the server so full
 * bodies never ship to the browser. Locked episodes only ever use the
 * author-written teaser; nothing is derived from their body.
 */
export function publicEpisodePreview(episode: {
  teaser: string | null;
  body: string;
  locked: boolean;
}): string | null {
  const teaser = episode.teaser?.trim();

  if (teaser) {
    return teaser;
  }

  if (episode.locked) {
    return null;
  }

  const words = episode.body
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (words.length === 0) {
    return null;
  }

  const excerpt = words.slice(0, EXCERPT_WORDS).join(" ");
  return words.length > EXCERPT_WORDS ? `${excerpt}...` : excerpt;
}
