export default function AboutPage() {
  return (
    <main className="p-8 md:p-10">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">About Platform</p>
        <h1 className="font-heading mt-3 text-5xl font-semibold text-white">
          A fiction platform with cinematic presence
        </h1>
        <p className="mt-4 max-w-3xl text-slate-400">
          Dramatized Fiction is built to make serialized written stories feel premium, performative, and immersive. The product direction blends polished SaaS structure with editorial storytelling surfaces.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold text-white">Readers</h2>
            <p className="mt-3 text-sm text-slate-400">
              Browse, discover, and read serialized fiction with a cleaner, more atmospheric experience.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold text-white">Creators</h2>
            <p className="mt-3 text-sm text-slate-400">
              Publish stories, manage episodes, and grow worlds through an intentional author workflow.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
