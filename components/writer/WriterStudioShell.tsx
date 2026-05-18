"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WriterStudioTabs from "@/components/writer/WriterStudioTabs";

const utilityLinks = [
  { href: "/writer", label: "Studio Home" },
  { href: "/writer/episodes", label: "Episodes" },
  { href: "/writer/stats", label: "Stats" },
  { href: "/writer/guidelines", label: "Guidelines" },
];

export default function WriterStudioShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="glass-panel rounded-[28px] border border-[var(--border-color)] px-5 py-5 md:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="eyebrow">Writer Studio</p>
              <div>
                <h1 className="font-heading theme-heading text-3xl font-semibold md:text-4xl">
                  Creator workspace shell
                </h1>
                <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
                  A minimal writing hub that can expand into drafting, character systems,
                  and performance tooling without changing the core navigation flow.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/writer/new-episode" className="story-button-primary justify-center">
                New Episode
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4 border-t border-[var(--border-color)] pt-5">
            <WriterStudioTabs />

            <div className="flex flex-wrap gap-2">
              {utilityLinks.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.24em] transition ${
                      active
                        ? "border-[var(--border-color)] text-[var(--text-primary)]"
                        : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <section className="glass-panel rounded-[28px] border border-[var(--border-color)] p-6 md:p-8">
          {children}
        </section>
      </div>
    </div>
  );
}
