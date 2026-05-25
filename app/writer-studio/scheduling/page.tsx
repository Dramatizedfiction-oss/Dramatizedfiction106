const releases = [
  { title: "Lantern Archive Episode 02", date: "Friday, 8:00 PM", status: "Ready" },
  { title: "Velvet Signals Author Note", date: "Next Tuesday", status: "Drafting" },
  { title: "Ash District WIP Update", date: "End of month", status: "Needs cover" },
];

export default function WriterStudioSchedulingPage() {
  return (
    <div className="space-y-7">
      <div>
        <p className="eyebrow">Scheduling</p>
        <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold">
          Plan releases without losing the mood
        </h1>
        <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
          A publish calendar shell for future automation, release windows, reminders, and scheduled episodes.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <p className="eyebrow">Schedule Composer</p>
          <h2 className="theme-heading mt-3 text-2xl font-semibold">Prepare a release slot</h2>
          <div className="mt-5 space-y-3">
            {["Story or episode", "Release date", "Audience note"].map((label) => (
              <div
                key={label}
                className="rounded-[18px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3"
              >
                <p className="theme-meta text-xs uppercase tracking-[0.2em]">{label}</p>
                <p className="theme-heading mt-2 text-sm">Placeholder input</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <p className="eyebrow">Upcoming</p>
          <h2 className="theme-heading mt-3 text-2xl font-semibold">Future release queue</h2>
          <div className="mt-5 space-y-3">
            {releases.map((release) => (
              <article
                key={release.title}
                className="rounded-[18px] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="theme-heading font-semibold">{release.title}</p>
                    <p className="theme-meta mt-1 text-sm">{release.date}</p>
                  </div>
                  <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs">
                    {release.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
