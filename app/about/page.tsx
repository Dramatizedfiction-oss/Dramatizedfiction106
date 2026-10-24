import CardPage from "@/components/content/CardPage";
import { getContent } from "@/lib/content/read";

// Text from Administration › Content (page.about); built-in text in lib/content/registry.ts.
export default async function AboutPage() {
  const { values } = await getContent("page.about");
  return (
    <main className="px-4 py-6 md:p-10">
      <CardPage eyebrow="About Platform" title={String(values.title)} intro={String(values.intro)} body={String(values.body)} columns={2} />
    </main>
  );
}
