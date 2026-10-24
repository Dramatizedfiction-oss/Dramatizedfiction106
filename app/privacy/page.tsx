import type { Metadata } from "next";
import LegalContentPage from "@/components/legal/LegalContentPage";

// Public page. Text from Administration › Content (legal.privacy), falling back to lib/legal/content/privacy.ts.
export const metadata: Metadata = { title: "Privacy Policy" };

export default function Page() {
  return <LegalContentPage slug="privacy" />;
}