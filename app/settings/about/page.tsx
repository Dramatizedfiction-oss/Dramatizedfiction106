import { SettingsPageHeader } from "@/components/settings/SettingsUi";
import { Group, Row } from "@/components/ui/Surface";

export const metadata = { title: "About & Help" };

/* Settings > About & Help: links to the About and AI-label pages and the six legal pages, as one grouped list. */
const LINKS = [
  { href: "/about", title: "About Dramatized Fiction", description: "What the platform is and who it's for." },
  { href: "/ai-usage", title: "AI labels", description: "What AI Free, AI Corrected, AI Heavy and AI Written mean." },
  { href: "/terms", title: "Terms of Service", description: "The agreement for using Dramatized Fiction." },
  { href: "/privacy", title: "Privacy Policy", description: "What we collect, why, and your choices." },
  { href: "/guidelines", title: "Community Guidelines", description: "What's allowed, AI-use labels and reporting." },
  { href: "/copyright", title: "Copyright Policy", description: "Takedown notices and counter-notices." },
  { href: "/cookies", title: "Cookie Notice", description: "The cookies and browser storage we use." },
  { href: "/contact", title: "Contact", description: "Questions, problems, feedback and reports." },
];

export default function AboutSettingsPage() {
  return (
    <main className="px-4 py-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <SettingsPageHeader title="About & Help" />
        {/* The platform pages first, then the legal pages, as two groups. */}
        <Group className="mt-6">
          {LINKS.slice(0, 2).map((link) => (
            <Row key={link.href} href={link.href} title={link.title} description={link.description} />
          ))}
        </Group>
        <Group className="mt-4">
          {LINKS.slice(2).map((link) => (
            <Row key={link.href} href={link.href} title={link.title} description={link.description} />
          ))}
        </Group>
      </div>
    </main>
  );
}
