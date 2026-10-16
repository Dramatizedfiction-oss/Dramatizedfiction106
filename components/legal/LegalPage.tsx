import RenderedMarkdown from "@/components/content/RenderedMarkdown";
import LegalHashOpener from "@/components/legal/LegalHashOpener";
import { parseMarkdown, splitSections } from "@/lib/content/markdown";
import { sectionId } from "@/lib/legal";

/*
 * Renders one legal page from Administration › Content (Sweep B3; the
 * approved text in lib/legal/content/*.ts is the built-in fallback): a narrow
 * reading column, "Effective [date]" under the title, an optional table of
 * contents, and each "## " section as a collapsible heading (all open).
 * [PLACEHOLDERS] are filled by `fill`; unfilled ones show as written.
 * Public: no session is read here. LegalArticle is also the editor preview.
 */
export type LegalPageProps = {
  title: string;
  body: string;
  showEffectiveDate: boolean;
  tableOfContents: boolean;
  fill: (text: string) => string;
};

export default function LegalPage(props: LegalPageProps) {
  return (
    <main className="px-4 py-8 md:px-8 md:py-12">
      <LegalArticle {...props} />
      <LegalHashOpener />
    </main>
  );
}

export function LegalArticle({ title, body, showEffectiveDate, tableOfContents, fill }: LegalPageProps) {
  const { intro, sections } = splitSections(parseMarkdown(body));

  return (
    <article className="mx-auto max-w-[42rem]">
      <header>
        <p className="eyebrow">Dramatized Fiction</p>
        <h1 className="font-heading theme-heading mt-3 text-balance text-3xl font-semibold leading-tight md:text-4xl">{fill(title)}</h1>
        {showEffectiveDate ? <p className="theme-meta mt-3 text-sm font-medium">{fill("Effective [EFFECTIVE DATE]")}</p> : null}
      </header>

      {tableOfContents && sections.length > 0 ? (
        <nav aria-labelledby="legal-toc" className="theme-panel mt-8 rounded-[22px] border p-4 sm:p-5">
          <h2 id="legal-toc" className="theme-heading text-sm font-semibold">
            On this page
          </h2>
          <ol className="mt-2 grid gap-x-6 sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={`${index}-${section.heading}`}>
                <a
                  href={`#${sectionId(section.heading)}`}
                  className="flex min-h-11 items-center text-sm text-[var(--text-secondary)] underline-offset-4 transition hover:text-[var(--text-primary)] hover:underline"
                >
                  {fill(section.heading)}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {intro.length ? <RenderedMarkdown blocks={intro} fill={fill} variant="legal" className="mt-8" /> : null}

      {sections.length > 0 ? (
        <div className="mt-8 divide-y divide-[var(--border-color)] border-y border-[var(--border-color)]">
          {sections.map((section, index) => {
            const id = sectionId(section.heading);
            return (
              <details key={`${index}-${section.heading}`} id={id} open className="legal-section group scroll-mt-20">
                <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))] [&::-webkit-details-marker]:hidden">
                  <h2 className="theme-heading text-lg font-semibold leading-snug">{fill(section.heading)}</h2>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-5 w-5 shrink-0 text-[var(--text-muted)] transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 8l5 5 5-5" />
                  </svg>
                </summary>
                <RenderedMarkdown blocks={section.blocks} fill={fill} variant="legal" className="pb-6" />
              </details>
            );
          })}
        </div>
      ) : null}

      {/* Links to the other legal pages are in the site footer. */}
    </article>
  );
}
