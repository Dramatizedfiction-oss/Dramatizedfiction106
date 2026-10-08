import type { ReactNode } from "react";

/** The headline panel at the top of each GROW page. */
export default function GrowHero({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-[var(--studio-border)] bg-[var(--studio-surface)] px-6 py-10 md:px-10 md:py-14"
      style={{
        backgroundImage:
          "radial-gradient(700px 320px at 92% -20%, var(--accent-soft), transparent 70%), radial-gradient(520px 260px at -8% 120%, var(--accent-soft), transparent 70%)",
      }}
    >
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="font-heading theme-heading mt-4 max-w-3xl text-balance text-3xl font-semibold leading-tight md:text-5xl">
        {title}
      </h2>
      <p className="theme-body mt-5 max-w-2xl text-base leading-7 md:text-lg">{body}</p>
      {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}
    </section>
  );
}
