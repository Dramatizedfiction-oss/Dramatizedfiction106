const mediaItems = [
  "Velvet Signals Cover",
  "Ash District Moodboard",
  "Lantern Archive Banner",
  "Character Portrait Set",
  "Episode Teaser Frame",
  "Series Launch Graphic",
];

export default function WriterStudioMediaPage() {
  return (
    <div className="space-y-7">
      <div>
        <p className="eyebrow">Covers & Media</p>
        <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold">
          Keep your story visuals close
        </h1>
        <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
          A future-ready shell for covers, banners, moodboards, and release imagery. Storage can plug into this structure later.
        </p>
      </div>

      <section className="rounded-[28px] border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-center">
        <p className="theme-heading text-xl font-semibold">Drop covers and media here</p>
        <p className="theme-meta mx-auto mt-3 max-w-xl text-sm leading-6">
          Upload wiring is intentionally deferred. This area establishes the visual asset workflow without committing to storage yet.
        </p>
        <button type="button" className="story-button-secondary mt-5">
          Upload Shell
        </button>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Library Preview</p>
            <h2 className="theme-heading mt-2 text-2xl font-semibold">Reusable media grid</h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mediaItems.map((item, index) => (
            <article
              key={item}
              className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
            >
              <div
                className={`aspect-video rounded-[18px] bg-gradient-to-br ${
                  index % 3 === 0
                    ? "from-violet-500/50 via-fuchsia-500/20 to-slate-950"
                    : index % 3 === 1
                      ? "from-rose-500/50 via-amber-500/20 to-stone-950"
                      : "from-sky-400/50 via-teal-500/20 to-zinc-950"
                }`}
              />
              <p className="theme-heading mt-3 text-sm font-semibold">{item}</p>
              <p className="theme-meta mt-1 text-xs">Placeholder asset</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
