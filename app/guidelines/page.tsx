import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { LEGAL_DOCUMENTS } from "@/lib/legal";

// Public, static page. Text lives in lib/legal/content/guidelines.ts; placeholders in lib/legal/placeholders.ts.
export const metadata: Metadata = { title: "Community Guidelines | Dramatized Fiction" };

export default function Page() {
  return <LegalPage document={LEGAL_DOCUMENTS.guidelines} />;
}