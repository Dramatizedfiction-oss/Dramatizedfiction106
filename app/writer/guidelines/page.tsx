export default function WriterGuidelinesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Guidelines</p>
        <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold">
          Trust, tone, and transparency
        </h2>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
          <p className="eyebrow">AI Disclosure</p>
          <p className="theme-body mt-4 text-sm leading-6">
            Every series and episode must carry an AI usage label so readers can understand how the work was produced.
          </p>
        </section>

        <section className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
          <p className="eyebrow">Reader Trust</p>
          <p className="theme-body mt-4 text-sm leading-6">
            Misleading labels can be flagged by readers through the public reporting action on cards and reading pages.
          </p>
        </section>

        <section className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
          <p className="eyebrow">Series Quality</p>
          <p className="theme-body mt-4 text-sm leading-6">
            Keep covers, teasers, and metadata aligned so discovery surfaces feel intentional and trustworthy.
          </p>
        </section>

        <section className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
          <p className="eyebrow">Creative Intent</p>
          <p className="theme-body mt-4 text-sm leading-6">
            The studio should feel like a workspace for authorship, not a noisy admin console. Write first, optimize second.
          </p>
        </section>
      </div>

      <section className="theme-panel rounded-[28px] border border-[var(--border-color)] p-6">
        <p className="eyebrow">Access Path</p>
        <h3 className="font-heading theme-heading mt-3 text-2xl font-semibold">
          Ready to apply?
        </h3>
        <p className="theme-meta mt-3 max-w-2xl text-sm leading-6">
          Once you acknowledge the writer policy, the platform will promote your
          account to author status, initialize your creator records, and unlock
          the studio automatically.
        </p>
      </section>
    </div>
  );
}
