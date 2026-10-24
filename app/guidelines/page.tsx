import type { Metadata } from "next";
import LegalContentPage from "@/components/legal/LegalContentPage";

// Public page. Text from Administration › Content (legal.guidelines), falling back to lib/legal/content/guidelines.ts.
export const metadata: Metadata = { title: "Community Guidelines" };

export default function Page() {
  return <LegalContentPage slug="guidelines" />;
}