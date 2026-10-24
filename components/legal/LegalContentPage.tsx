import LegalPage from "@/components/legal/LegalPage";
import { getContent } from "@/lib/content/read";
import { LEGAL_PLACEHOLDER_KEYS, placeholderField } from "@/lib/content/registry";
import { LEGAL_DOCUMENTS, type LegalSlug } from "@/lib/legal";
import { placeholderFiller } from "@/lib/legal/placeholders";

/*
 * A legal page as edited in Administration › Content (legal.<slug>), with its
 * placeholders filled from Legal placeholders. Falls back to the approved
 * text in lib/legal/content when the item is missing or invalid.
 */
export default async function LegalContentPage({ slug }: { slug: LegalSlug }) {
  const [page, placeholders] = await Promise.all([getContent(`legal.${slug}`), getContent("legal.placeholders")]);
  const values = Object.fromEntries(LEGAL_PLACEHOLDER_KEYS.map((key) => [key, String(placeholders.values[placeholderField(key)] ?? "")]));
  const document = LEGAL_DOCUMENTS[slug];
  return (
    <LegalPage
      title={String(page.values.title)}
      body={String(page.values.body)}
      showEffectiveDate={document.showEffectiveDate}
      tableOfContents={document.tableOfContents}
      fill={placeholderFiller(values)}
      updatedAt={page.updatedAt}
    />
  );
}
