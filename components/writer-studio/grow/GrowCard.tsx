import Link from "next/link";
import type { ReactNode } from "react";
import AvailabilityTag from "@/components/writer-studio/grow/AvailabilityTag";
import type { Availability, GrowItem } from "@/lib/grow/content";

/** One card in a GROW grid. With `href` the whole card is a link. */
export default function GrowCard({
  title,
  body,
  availability,
  href,
  children,
}: {
  title: string;
  body: string;
  availability?: Availability;
  href?: string;
  children?: ReactNode;
}) {
  const content = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h3 className="theme-heading min-w-0 font-semibold">{title}</h3>
        {availability ? <AvailabilityTag availability={availability} /> : null}
      </div>
      <p className="theme-meta mt-2 text-sm leading-6">{body}</p>
      {children}
      {href ? (
        <p className="mt-4 text-sm font-semibold text-[var(--studio-accent)]">
          Open <span aria-hidden>→</span>
        </p>
      ) : null}
    </>
  );
  const className =
    "block h-full rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-5";

  return href ? (
    <Link href={href} className={`${className} transition hover:border-[var(--studio-muted)]`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function GrowCardGrid({ items, columns = 3 }: { items: GrowItem[]; columns?: 2 | 3 }) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${columns === 3 ? "lg:grid-cols-3" : ""}`}>
      {items.map((item) => (
        <GrowCard key={item.title} title={item.title} body={item.body} availability={item.availability} />
      ))}
    </div>
  );
}
