import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { LEGAL_DOCUMENTS } from "@/lib/legal";

// Public, static page. Text lives in lib/legal/content/terms.ts; placeholders in lib/legal/placeholders.ts.
export const metadata: Metadata = { title: "Terms of Service | Dramatized Fiction" };

export default function Page() {
  return <LegalPage document={LEGAL_DOCUMENTS.terms} />;
}