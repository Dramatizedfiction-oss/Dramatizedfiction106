import RenderedMarkdown from "@/components/content/RenderedMarkdown";
import { FeatureCard } from "@/components/ui/Surface";
import { parseMarkdown, splitSections } from "@/lib/content/markdown";

/*
 * The About and AI Usage pages (Administration › Content: page.about,
 * page.ai-usage): eyebrow, title, introduction, then one block per "## "
 * heading in the body. Also the editor preview. No hooks, so it renders in
 * server and client components. Sweep E: About's blocks are feature cards
 * side by side from md (columns={2}); AI Usage's are divider-led sections in
 * a reading column, since each one defines a label.
 */
export default function CardPage({
  eyebrow,
  title,
  intro,
  body,
  columns = 1,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  body: string;
  /** About shows feature cards side by side from md; AI Usage reads as sections. */
  columns?: 1 | 2;
}) {
  const introBlocks = parseMarkdown(intro);
  const { intro: loose, sections } = splitSections(parseMarkdown(body));

  return (
    <div className={columns === 2 ? "mx-auto max-w-4xl" : "mx-auto max-w-[var(--prose-measure)]"}>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="font-heading theme-heading mt-3 text-balance text-4xl font-semibold md:text-5xl">{title}</h1>
      {introBlocks.length ? (
        <RenderedMarkdown blocks={introBlocks} variant="plain" className="mt-4 max-w-3xl text-lg leading-8 text-[var(--text-secondary)]" />
      ) : null}
      {loose.length ? <RenderedMarkdown blocks={loose} className="surface-prose mt-6" /> : null}

      {sections.length ? (
        columns === 2 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {sections.map((section, index) => (
              <FeatureCard key={`${index}-${section.heading}`}>
                <section>
                  <h2 className="theme-heading text-xl font-semibold">{section.heading}</h2>
                  <RenderedMarkdown blocks={section.blocks} variant="plain" className="theme-meta mt-3 text-sm leading-6" />
                </section>
              </FeatureCard>
            ))}
          </div>
        ) : (
          <div className="mt-8">
            {sections.map((section, index) => (
              <section key={`${index}-${section.heading}`} className="surface-section py-6">
                <h2 className="theme-heading text-xl font-semibold">{section.heading}</h2>
                <RenderedMarkdown blocks={section.blocks} className="surface-prose mt-3" />
              </section>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
