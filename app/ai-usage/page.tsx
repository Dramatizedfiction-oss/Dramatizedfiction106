import CardPage from "@/components/content/CardPage";
import { getContent } from "@/lib/content/read";

// Text from Administration › Content (page.ai-usage); built-in text in lib/content/registry.ts.
export default async function AIUsagePage() {
  const { values } = await getContent("page.ai-usage");
  return (
    <main className="px-4 py-6 md:p-10">
      <CardPage eyebrow="AI Usage" title={String(values.title)} intro={String(values.intro)} body={String(values.body)} />
    </main>
  );
}
