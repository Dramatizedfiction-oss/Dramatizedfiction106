import RenderedMarkdown from "@/components/content/RenderedMarkdown";
import { parseMarkdown, splitSections } from "@/lib/content/markdown";

/*
 * The About and AI Usage pages (Administration › Content: page.about,
 * page.ai-usage): eyebrow, title, introduction, then one card per "## "
 * heading in the body. Also the editor preview. No hooks, so it renders in
 * server and client components.
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
  /** About shows its cards side by side from md; AI Usage stacks them. */
  columns?: 1 | 2;
}) {
  const introBlocks = parseMarkdown(intro);
  const { intro: loose, sections } = splitSections(parseMarkdown(body));

  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="font-heading theme-heading mt-3 text-balance text-4xl font-semibold md:text-5xl">{title}</h1>
      {introBlocks.length ? <RenderedMarkdown blocks={introBlocks} variant="plain" className="theme-meta mt-4 max-w-3xl" /> : null}
      {loose.length ? <RenderedMarkdown blocks={loose} className="mt-6 max-w-3xl" /> : null}

      {sections.length ? (
        <div className={`mt-8 grid gap-4 ${columns === 2 ? "md:grid-cols-2" : ""}`}>
          {sections.map((section, index) => (
            <section key={`${index}-${section.heading}`} className="theme-panel rounded-[28px] border p-6">
              <h2 className="theme-heading text-xl font-semibold">{section.heading}</h2>
              <RenderedMarkdown blocks={section.blocks} variant="plain" className="theme-meta mt-3 text-sm" />
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
