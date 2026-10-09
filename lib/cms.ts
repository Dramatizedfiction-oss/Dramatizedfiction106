import { prisma } from "@/lib/prisma";

export const WRITER_ONBOARDING_SLUG = "writer-onboarding";

const defaultArticles = {
  [WRITER_ONBOARDING_SLUG]: {
    title: "Start Writing With Us",
    quickSectionContent:
      "Dramatized Fiction is built for serialized storytellers who want their work to feel premium, alive, and easy to follow. Writers can publish series, release episodes, and build an audience inside a story-first platform.",
    deepSectionContent:
      "Writers who join Dramatized Fiction are stepping into a platform designed around long-form worlds, episode flow, and reader retention. This deeper section can explain expectations, editorial standards, release rhythm, and what support the platform offers as it grows.",
  },
} as const;

export type CmsArticleShape = {
  title: string;
  quickSectionContent: string;
  deepSectionContent: string;
  /** null when the article has never been saved (defaults are shown). */
  lastUpdated: Date | null;
};

export function isKnownCmsSlug(slug: string): slug is keyof typeof defaultArticles {
  return Object.prototype.hasOwnProperty.call(defaultArticles, slug);
}

/**
 * Read-only: safe for GET handlers and rendering. Returns the stored article,
 * the built-in defaults for a known slug that has never been saved, or null
 * for an unknown slug. Rows are only written by the CMS PATCH route.
 */
export async function getCmsArticle(slug: string): Promise<CmsArticleShape | null> {
  const article = await prisma.cmsArticle.findUnique({
    where: { slug },
    select: {
      title: true,
      quickSectionContent: true,
      deepSectionContent: true,
      lastUpdated: true,
    },
  });

  if (article) {
    return article;
  }

  if (isKnownCmsSlug(slug)) {
    return { ...defaultArticles[slug], lastUpdated: null };
  }

  return null;
}
