import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal";

/** The six legal links, small and wrapping on phones. Used in every page footer. */
export default function LegalFooterLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={className}>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-0 sm:justify-start">
        {LEGAL_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex min-h-11 items-center text-xs text-[var(--text-muted)] underline-offset-4 transition hover:text-[var(--text-primary)] hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
