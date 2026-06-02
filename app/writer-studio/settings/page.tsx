export default function WriterStudioSettingsPage() {
  return (
    <div className="space-y-7">
      <div>
        <p className="eyebrow">Settings</p>
        <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold">
          Shape your creator presence
        </h1>
        <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
          A focused settings foundation for profile presentation, studio preferences, and future creator controls.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[
          ["Creator Profile", "Display name, tagline, and author presence."],
          ["Studio Preferences", "Default drafting views and release workflow choices."],
          ["Audience Signals", "Future controls for follows, updates, and creator notes."],
          ["Publishing Defaults", "Reusable labels and visibility defaults for new work."],
        ].map(([title, description]) => (
          <section
            key={title}
            className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5"
          >
            <h2 className="theme-heading text-xl font-semibold">{title}</h2>
            <p className="theme-meta mt-3 text-sm leading-6">{description}</p>
            <div className="mt-5 rounded-[18px] border border-dashed border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
              <p className="theme-meta text-sm">Settings controls plug in here.</p>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
