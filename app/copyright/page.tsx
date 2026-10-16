import type { Metadata } from "next";
import LegalContentPage from "@/components/legal/LegalContentPage";

// Public page. Text from Administration › Content (legal.copyright), falling back to lib/legal/content/copyright.ts.
export const metadata: Metadata = { title: "Copyright Policy | Dramatized Fiction" };

export default function Page() {
  return <LegalContentPage slug="copyright" />;
}