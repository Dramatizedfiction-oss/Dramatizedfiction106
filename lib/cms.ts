import { prisma } from "@/lib/prisma";

export const WRITER_ONBOARDING_SLUG = "writer-onboarding";

const defaultArticles = {
  [WRITER_ONBOARDING_SLUG]: {
    title: "Start Writing With Us",
    quickSectionContent:
      "Dramatized Fiction is built for serialized storytellers who want their work to feel premium, alive, and easy to follow. Writers can publish series, release episodes, and build an audience inside a story-first platform.",
    deepSectionContent:
      "Writers who join Dramatized Fiction are stepping into a platform designed around long-form worlds, episode flow, and reader retention. This deeper section can explain expectations, editorial standards, release rhythm, and what support the platform offers as the Command Center evolves.",
  },
} as const;

export type CmsArticleShape = {
  title: string;
  quickSectionContent: string;
  deepSectionContent: string;
  lastUpdated: Date;
};

export async function getCmsArticle(slug: string): Promise<CmsArticleShape> {
  const defaults =
    defaultArticles[slug as keyof typeof defaultArticles] ??
    defaultArticles[WRITER_ONBOARDING_SLUG];

  const article = await prisma.cmsArticle.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      title: defaults.title,
      quickSectionContent: defaults.quickSectionContent,
      deepSectionContent: defaults.deepSectionContent,
    },
  });

  return {
    title: article.title,
    quickSectionContent: article.quickSectionContent,
    deepSectionContent: article.deepSectionContent,
    lastUpdated: article.lastUpdated,
  };
}
