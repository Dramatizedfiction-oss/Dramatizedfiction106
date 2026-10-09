import { auth } from "@/auth";
import OnboardingArticleEditor from "@/components/admin/OnboardingArticleEditor";
import { WRITER_ONBOARDING_SLUG, getCmsArticle } from "@/lib/cms";
import { requireAdministrationPage } from "@/lib/utils";

export default async function ContentPage() {
  requireAdministrationPage(await auth(), "/administration/content");
  const article = await getCmsArticle(WRITER_ONBOARDING_SLUG);

  return (
    <OnboardingArticleEditor
      slug={WRITER_ONBOARDING_SLUG}
      initial={{
        title: article?.title ?? "",
        quickSectionContent: article?.quickSectionContent ?? "",
        deepSectionContent: article?.deepSectionContent ?? "",
        lastUpdated: article?.lastUpdated ? article.lastUpdated.toISOString() : null,
      }}
    />
  );
}
