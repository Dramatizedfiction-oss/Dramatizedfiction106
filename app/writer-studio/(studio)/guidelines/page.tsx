import { AI_USAGE_OPTIONS, aiUsageDescription } from "@/lib/ai-usage";
import { WRITER_ONBOARDING_SLUG, getCmsArticle } from "@/lib/cms";
import { requireStudioUser } from "@/lib/writer-studio/session";

function paragraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

// How the studio actually behaves; kept in sync with the publish and save code.
const PUBLISHING_FACTS = [
  "Drafts are private. Only you can open or preview them.",
  "Publishing an episode makes it visible to readers. The first published episode also makes its series visible.",
  "Episode numbers are assigned in order when you create an episode.",
  "Drafts save automatically while you write. A copy is also kept on your device in case the connection drops.",
  "Edits to a live episode aren't sent until you press Update live, and then readers see them right away.",
  "Readers see bold, italics, headings, quotes and scene breaks exactly as you format them.",
];

export default async function StudioGuidelinesPage() {
  await requireStudioUser();
  const article = await getCmsArticle(WRITER_ONBOARDING_SLUG);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-8">
        {article ? (
          <section className="rounded-3xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-6">
            <h2 className="font-heading theme-heading text-2xl font-semibold">{article.title}</h2>
            <div className="theme-body mt-4 space-y-4 text-sm leading-7">
              {paragraphs(article.quickSectionContent).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {paragraphs(article.deepSectionContent).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-6">
          <h2 className="font-heading theme-heading text-2xl font-semibold">Choosing your AI label</h2>
          <p className="theme-meta mt-2 text-sm leading-6">
            Every episode carries a public label describing how AI was used. Choose the one that honestly fits.
          </p>
          <dl className="mt-5 space-y-4">
            {AI_USAGE_OPTIONS.map((option) => (
              <div key={option}>
                <dt className="theme-heading text-sm font-semibold">{option}</dt>
                <dd className="theme-meta mt-1 text-sm">{aiUsageDescription(option)}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <aside>
        <section className="rounded-3xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-6 lg:sticky lg:top-6">
          <h2 className="font-heading theme-heading text-xl font-semibold">How publishing works</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--studio-text)]">
            {PUBLISHING_FACTS.map((fact) => (
              <li key={fact} className="flex gap-3">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--studio-accent)]" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
