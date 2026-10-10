import Link from "next/link";
import { ChevronIcon, SettingsPageHeader } from "@/components/settings/SettingsUi";

/*
 * Settings > About & Help: links to pages that exist. Terms, Privacy,
 * Community Guidelines and Contact will be added here once those pages exist.
 */
const LINKS = [
  { href: "/about", title: "About Dramatized Fiction", description: "What the platform is and who it's for." },
  { href: "/ai-usage", title: "AI labels", description: "What AI Free, AI Corrected, AI Heavy and AI Written mean." },
];

export default function AboutSettingsPage() {
  return (
    <main className="px-4 py-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <SettingsPageHeader title="About & Help" />
        <ul className="mt-6 space-y-3">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="theme-panel group flex min-h-[64px] items-center gap-4 rounded-[22px] border px-4 py-3 transition hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))] sm:px-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="theme-heading block text-base font-semibold">{link.title}</span>
                  <span className="theme-meta mt-0.5 block text-sm leading-5">{link.description}</span>
                </span>
                <ChevronIcon />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
