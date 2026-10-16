import { getContent } from "@/lib/content/read";

/*
 * The writer onboarding article, now an Administration › Content item
 * (article.writer-onboarding, Sweep B3). This keeps the old shape for
 * existing callers (the pages and GET /api/cms/articles/[slug]); the built-in
 * text lives in lib/content/registry.ts. The CmsArticle table is no longer
 * read; its row (if any) seeded the Content item.
 */

export const WRITER_ONBOARDING_SLUG = "writer-onboarding";
export const WRITER_ONBOARDING_KEY = "article.writer-onboarding";

export type CmsArticleShape = {
  title: string;
  /** Content Markdown. */
  quickSectionContent: string;
  /** Content Markdown. */
  deepSectionContent: string;
  /** null when the article has never been saved (defaults are shown). */
  lastUpdated: Date | null;
};

export function isKnownCmsSlug(slug: string) {
  return slug === WRITER_ONBOARDING_SLUG;
}

/** Read-only. The article (saved or built-in), or null for an unknown slug. Never throws for a known slug. */
export async function getCmsArticle(slug: string): Promise<CmsArticleShape | null> {
  if (!isKnownCmsSlug(slug)) return null;
  const { values, updatedAt } = await getContent(WRITER_ONBOARDING_KEY);
  return {
    title: String(values.title),
    quickSectionContent: String(values.quick),
    deepSectionContent: String(values.deep),
    lastUpdated: updatedAt ? new Date(updatedAt) : null,
  };
}
