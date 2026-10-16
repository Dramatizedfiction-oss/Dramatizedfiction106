"use client";

import AnnouncementBar from "@/components/content/AnnouncementBar";
import CardPage from "@/components/content/CardPage";
import RenderedMarkdown from "@/components/content/RenderedMarkdown";
import { LegalArticle } from "@/components/legal/LegalPage";
import { parseMarkdown } from "@/lib/content/markdown";
import type { ContentDef, ContentValues } from "@/lib/content/registry";

/*
 * Administration › Content preview: the item drawn with the same components
 * the live page uses (legal pages, About/AI Usage cards, the onboarding
 * article, the banner), so what you see is what visitors get.
 */
const LEGAL_LAYOUT: Record<string, { showEffectiveDate: boolean; tableOfContents: boolean }> = {
  "legal.terms": { showEffectiveDate: true, tableOfContents: true },
  "legal.privacy": { showEffectiveDate: true, tableOfContents: true },
  "legal.contact": { showEffectiveDate: false, tableOfContents: false },
};

export default function ContentPreview({ def, values }: { def: ContentDef; values: ContentValues }) {
  const text = (name: string) => String(values[name] ?? "");

  if (def.preview === "document" && def.section === "legal") {
    const layout = LEGAL_LAYOUT[def.key] ?? { showEffectiveDate: true, tableOfContents: false };
    return <LegalArticle title={text("title")} body={text("body")} fill={(value) => value} {...layout} />;
  }
  if (def.preview === "document") {
    return <CardPage eyebrow={def.label} title={text("title")} intro={text("intro")} body={text("body")} columns={def.key === "page.about" ? 2 : 1} />;
  }
  if (def.preview === "article") {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Writer Onboarding</p>
        <h1 className="font-heading theme-heading mt-3 text-3xl font-semibold md:text-4xl">{text("title")}</h1>
        <h2 className="font-heading theme-heading mt-8 text-2xl font-semibold">Quick overview</h2>
        <RenderedMarkdown blocks={parseMarkdown(text("quick"))} className="mt-3" />
        <h2 className="font-heading theme-heading mt-8 text-2xl font-semibold">Deeper understanding</h2>
        <RenderedMarkdown blocks={parseMarkdown(text("deep"))} className="mt-3" />
      </div>
    );
  }
  if (def.preview === "banner") {
    if (values.enabled !== true) return <p className="theme-meta text-sm">The banner is off, so visitors don&apos;t see it.</p>;
    return (
      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)]">
        <AnnouncementBar preview announcement={{ text: text("text"), linkLabel: text("linkLabel"), linkHref: text("linkHref") }} />
      </div>
    );
  }
  return (
    <dl className="space-y-3">
      {def.fields.map((field) => (
        <div key={field.name}>
          <dt className="theme-meta text-xs uppercase tracking-[0.14em]">{field.label}</dt>
          <dd className="theme-heading mt-1 break-words text-base">
            {text(field.name) || <span className="theme-meta italic">{field.hint ?? "Empty"}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
