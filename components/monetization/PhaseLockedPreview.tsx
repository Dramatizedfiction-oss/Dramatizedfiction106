export default function PhaseLockedPreview({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)]/60 p-5 opacity-80">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Unlocks in Phase 2</p>
          <h3 className="theme-heading mt-2 text-xl font-semibold">{title}</h3>
          <p className="theme-meta mt-3 text-sm leading-6">{description}</p>
        </div>
        <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
          Locked
        </span>
      </div>

      {children ? <div className="mt-4 pointer-events-none">{children}</div> : null}
    </section>
  );
}
