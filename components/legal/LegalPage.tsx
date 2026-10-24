import RenderedMarkdown from "@/components/content/RenderedMarkdown";
import LegalHashOpener from "@/components/legal/LegalHashOpener";
import LegalTocRail, { type TocSection } from "@/components/legal/LegalToc";
import { Callout, Facts } from "@/components/ui/Surface";
import { parseMarkdown, splitSections } from "@/lib/content/markdown";
import { sectionId } from "@/lib/legal";

/*
 * Renders one legal page from Administration › Content (Sweep B3; the
 * approved text in lib/legal/content/*.ts is the built-in fallback). Sweep E
 * layout, wording unchanged:
 *   - header: title, then a facts strip ("Effective [date]", "Last updated
 *     {date}" when the page was saved in Content, "{n} sections");
 *   - "Jump to section": one closed row on phones; a sticky side rail with
 *     the current section marked on wide screens (`rail`, the live page);
 *   - the intro (text before the first "## ") as a summary callout;
 *   - each "## " section divider-led, its leading number in a small marker,
 *     collapsible (all open); "Back to top" at the end.
 * [PLACEHOLDERS] are filled by `fill`; unfilled ones show as written.
 * Public: no session is read here. LegalArticle is also the editor preview.
 */
export type LegalPageProps = {
  title: string;
  body: string;
  showEffectiveDate: boolean;
  tableOfContents: boolean;
  fill: (text: string) => string;
  /** When the page was last saved in Administration › Content (null: built-in text). */
  updatedAt?: string | null;
};

export default function LegalPage(props: LegalPageProps) {
  return (
    <main className="px-4 py-8 md:px-8 md:py-12">
      <LegalArticle {...props} rail />
      <LegalHashOpener />
    </main>
  );
}

/** "1. Who can use…" → number "1." and title "Who can use…" (headings without a number keep their text). */
function splitNumber(heading: string): { number: string | null; title: string } {
  const match = /^(\d+(?:\.\d+)*\.?)\s+(.+)$/.exec(heading.trim());
  return match ? { number: match[1], title: match[2] } : { number: null, title: heading };
}

function formatDay(value: string) {
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function LegalArticle({
  title,
  body,
  showEffectiveDate,
  tableOfContents,
  fill,
  updatedAt = null,
  rail = false,
}: LegalPageProps & { rail?: boolean }) {
  const { intro, sections } = splitSections(parseMarkdown(body));
  const toc: TocSection[] = sections.map((section) => ({ id: sectionId(section.heading), ...splitNumber(fill(section.heading)) }));
  const showToc = tableOfContents && sections.length > 0;
  const withRail = rail && showToc;

  const article = (
    <article className="min-w-0 max-w-[var(--prose-measure)]">
      <header id="top" className="scroll-mt-24">
        <p className="eyebrow">Dramatized Fiction</p>
        <h1 className="font-heading theme-heading mt-3 text-balance text-3xl font-semibold leading-tight md:text-4xl">{fill(title)}</h1>
        <Facts
          className="mt-5"
          items={[
            showEffectiveDate ? <span key="effective">{fill("Effective [EFFECTIVE DATE]")}</span> : null,
            updatedAt ? <span key="updated">Last updated {formatDay(updatedAt)}</span> : null,
            sections.length > 0 ? <span key="sections">{sections.length} sections</span> : null,
          ]}
        />
      </header>

      {showToc ? (
        <details className={`group/toc surface-group mt-6 ${withRail ? "lg:hidden" : ""}`}>
          <summary className="surface-row cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex-1">Jump to section</span>
            <Chevron className="group-open/toc:rotate-180" />
          </summary>
          <ol className="border-t border-[var(--border-color)] py-1">
            {toc.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="flex min-h-11 items-baseline gap-3 px-4 py-2.5 text-sm leading-5 text-[var(--text-secondary)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--text-primary)]">
                  {section.number ? <span className="surface-section-number w-6 shrink-0">{section.number}</span> : null}
                  <span>{section.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      {intro.length ? (
        <Callout className="mt-8">
          <RenderedMarkdown blocks={intro} fill={fill} variant="legal" />
        </Callout>
      ) : null}

      {sections.length > 0 ? (
        <div className="mt-8">
          {sections.map((section, index) => {
            const { id, number, title: sectionTitle } = toc[index];
            return (
              <details key={`${index}-${section.heading}`} id={id} open className="legal-section surface-section group scroll-mt-24">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-3 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))] [&::-webkit-details-marker]:hidden">
                  <h2 className="theme-heading flex min-w-0 flex-1 items-baseline gap-3 text-lg font-semibold leading-snug">
                    {number ? <span className="surface-section-number w-7 shrink-0">{number}</span> : null}
                    <span>{sectionTitle}</span>
                  </h2>
                  <Chevron className="group-open:rotate-180" />
                </summary>
                <RenderedMarkdown blocks={section.blocks} fill={fill} variant="legal" className={`pb-8 ${number ? "sm:pl-10" : ""}`} />
              </details>
            );
          })}
          <div className="surface-section pt-6">
            <a href="#top" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--text-primary)] underline decoration-1 underline-offset-4 hover:decoration-2">
              Back to top
            </a>
          </div>
        </div>
      ) : null}
    </article>
  );

  if (!withRail) return <div className="mx-auto max-w-[var(--prose-measure)]">{article}</div>;
  return (
    <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">
      <aside className="hidden lg:block">
        <LegalTocRail sections={toc} />
      </aside>
      {article}
    </div>
  );
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`h-5 w-5 shrink-0 text-[var(--text-muted)] transition-transform ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}
