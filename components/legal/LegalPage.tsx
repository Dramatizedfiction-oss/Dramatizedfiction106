import LegalHashOpener from "@/components/legal/LegalHashOpener";
import { sectionId } from "@/lib/legal";
import { fillPlaceholders } from "@/lib/legal/placeholders";
import type { LegalBlock, LegalDocument } from "@/lib/legal/types";

/*
 * Renders one static legal page (lib/legal/content/*.ts) exactly as written:
 * a narrow reading column, "Effective [date]" under the title, an optional
 * table of contents, and numbered sections as collapsible headings (all open).
 * Public: no session is read here.
 */
export default function LegalPage({ document }: { document: LegalDocument }) {
  const t = fillPlaceholders;

  return (
    <main className="px-4 py-8 md:px-8 md:py-12">
      <article className="mx-auto max-w-[42rem]">
        <header>
          <p className="eyebrow">Dramatized Fiction</p>
          <h1 className="font-heading theme-heading mt-3 text-balance text-3xl font-semibold leading-tight md:text-4xl">{document.title}</h1>
          {document.showEffectiveDate ? (
            <p className="theme-meta mt-3 text-sm font-medium">{t("Effective [EFFECTIVE DATE]")}</p>
          ) : null}
        </header>

        {document.tableOfContents && document.sections.length > 0 ? (
          <nav aria-labelledby="legal-toc" className="theme-panel mt-8 rounded-[22px] border p-4 sm:p-5">
            <h2 id="legal-toc" className="theme-heading text-sm font-semibold">
              On this page
            </h2>
            <ol className="mt-2 grid gap-x-6 sm:grid-cols-2">
              {document.sections.map((section) => (
                <li key={section.heading}>
                  <a
                    href={`#${sectionId(section.heading)}`}
                    className="flex min-h-11 items-center text-sm text-[var(--text-secondary)] underline-offset-4 transition hover:text-[var(--text-primary)] hover:underline"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="legal-body mt-8 space-y-4">
          {document.intro.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </div>

        {document.sections.length > 0 ? (
          <div className="mt-8 divide-y divide-[var(--border-color)] border-y border-[var(--border-color)]">
            {document.sections.map((section) => {
              const id = sectionId(section.heading);
              return (
                <details key={section.heading} id={id} open className="legal-section group scroll-mt-20">
                  <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))] [&::-webkit-details-marker]:hidden">
                    <h2 className="theme-heading text-lg font-semibold leading-snug">{section.heading}</h2>
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
                  <div className="legal-body space-y-4 pb-6">
                    {section.blocks.map((block, index) => (
                      <Block key={index} block={block} />
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        ) : null}

        {/* Links to the other legal pages are in the site footer. */}
      </article>
      <LegalHashOpener />
    </main>
  );
}

function Block({ block }: { block: LegalBlock }) {
  const t = fillPlaceholders;
  switch (block.type) {
    case "p":
      return <p>{t(block.text)}</p>;
    case "label":
      return <p className="theme-heading pt-1 font-semibold">{t(block.text)}</p>;
    case "ul":
      return (
        <ul className="list-disc space-y-2 pl-5">
          {block.items.map((item) => (
            <li key={item}>{t(item)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal space-y-2 pl-5">
          {block.items.map((item) => (
            <li key={item}>{t(item)}</li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <div className="theme-panel rounded-[22px] border p-5 text-base leading-7 sm:p-6">
          <p className="theme-body">{t(block.text)}</p>
        </div>
      );
    case "table":
      return (
        <table className="legal-table w-full text-left text-sm">
          <thead>
            <tr>
              {block.columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, index) => (
                  <td key={index} data-label={block.columns[index]}>
                    {t(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
  }
}
