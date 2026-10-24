import type { Metadata } from "next";
import LegalContentPage from "@/components/legal/LegalContentPage";

// Public page. Text from Administration › Content (legal.terms), falling back to lib/legal/content/terms.ts.
export const metadata: Metadata = { title: "Terms of Service" };

export default function Page() {
  return <LegalContentPage slug="terms" />;
}