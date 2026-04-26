import Link from "next/link";
import { WRITER_ONBOARDING_SLUG, getCmsArticle } from "@/lib/cms";

function renderParagraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export default async function WriterOnboardingPage() {
  const article = await getCmsArticle(WRITER_ONBOARDING_SLUG);
  const quickParagraphs = renderParagraphs(article.quickSectionContent);
  const deepParagraphs = renderParagraphs(article.deepSectionContent);

  return (
    <main className="overflow-hidden px-4 py-6 md:px-6 lg:px-8">
      <section className="glass-panel rounded-[32px] border border-[var(--border-color)] p-6 md:p-8">
        <p className="eyebrow">Writer Onboarding</p>
        <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold md:text-6xl">
          {article.title}
        </h1>
        <p className="theme-meta mt-4 text-sm">
          Last updated {article.lastUpdated.toLocaleDateString()}
        </p>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-6">
            <section className="theme-panel rounded-[28px] border border-[var(--border-color)] p-6">
              <p className="eyebrow">Step 1</p>
              <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">
                Quick overview
              </h2>
              <div className="theme-body mt-4 space-y-4 text-base leading-7">
                {quickParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>

            <details className="theme-panel rounded-[28px] border border-[var(--border-color)] p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">Step 2</p>
                  <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">
                    Deeper understanding
                  </h2>
                </div>
                <span className="theme-meta text-xs uppercase tracking-[0.24em]">
                  Optional
                </span>
              </summary>

              <div className="theme-body mt-4 space-y-4 text-base leading-7">
                {deepParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </details>

            <section className="theme-panel rounded-[28px] border border-[var(--border-color)] p-6">
              <p className="eyebrow">Step 3</p>
              <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">
                Apply to write
              </h2>
              <p className="theme-meta mt-4 max-w-2xl text-sm leading-6">
                When you are ready, move into the writer flow. This entry can be redirected later to a fuller application review system without changing the onboarding article itself.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/api/auth/signin?callbackUrl=/series/new"
                  className="story-button-primary"
                >
                  Apply Now
                </Link>
                <Link href="/explore" className="story-button-secondary">
                  Keep Exploring
                </Link>
              </div>
            </section>
          </div>

          <aside className="hidden xl:block">
            <div className="theme-panel sticky top-28 rounded-[28px] border border-[var(--border-color)] p-5">
              <p className="eyebrow">Flow</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[20px] border border-[var(--border-color)] px-4 py-3">
                  <p className="theme-heading text-sm font-medium">1. Quick overview</p>
                </div>
                <div className="rounded-[20px] border border-[var(--border-color)] px-4 py-3">
                  <p className="theme-heading text-sm font-medium">2. Deeper understanding</p>
                </div>
                <div className="rounded-[20px] border border-[var(--border-color)] px-4 py-3">
                  <p className="theme-heading text-sm font-medium">3. Apply</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
