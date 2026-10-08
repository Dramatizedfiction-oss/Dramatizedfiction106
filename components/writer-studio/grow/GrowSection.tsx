import type { ReactNode } from "react";

/** A titled block within a GROW page. */
export default function GrowSection({
  eyebrow,
  title,
  intro,
  aside,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2 className="font-heading theme-heading mt-2 text-2xl font-semibold md:text-3xl">{title}</h2>
          {intro ? <p className="theme-meta mt-2 max-w-2xl text-sm leading-6">{intro}</p> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}
