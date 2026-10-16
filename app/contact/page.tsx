import type { Metadata } from "next";
import LegalContentPage from "@/components/legal/LegalContentPage";

// Public page. Text from Administration › Content (legal.contact), falling back to lib/legal/content/contact.ts.
export const metadata: Metadata = { title: "Contact | Dramatized Fiction" };

export default function Page() {
  return <LegalContentPage slug="contact" />;
}