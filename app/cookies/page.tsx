import type { Metadata } from "next";
import LegalContentPage from "@/components/legal/LegalContentPage";

// Public page. Text from Administration › Content (legal.cookies), falling back to lib/legal/content/cookies.ts.
export const metadata: Metadata = { title: "Cookie Notice | Dramatized Fiction" };

export default function Page() {
  return <LegalContentPage slug="cookies" />;
}