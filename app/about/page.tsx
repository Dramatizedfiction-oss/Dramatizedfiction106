export default function AboutPage() {
  return (
    <main className="p-8 md:p-10">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">About Platform</p>
        <h1 className="font-heading theme-heading mt-3 text-5xl font-semibold">
          A fiction platform with cinematic presence
        </h1>
        <p className="theme-meta mt-4 max-w-3xl">
          Dramatized Fiction is built to make serialized written stories feel premium, performative, and immersive. The product direction blends polished SaaS structure with editorial storytelling surfaces.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="theme-panel rounded-[28px] border p-6">
            <h2 className="theme-heading text-xl font-semibold">Readers</h2>
            <p className="theme-meta mt-3 text-sm">
              Browse, discover, and read serialized fiction with a cleaner, more atmospheric experience.
            </p>
          </div>

          <div className="theme-panel rounded-[28px] border p-6">
            <h2 className="theme-heading text-xl font-semibold">Creators</h2>
            <p className="theme-meta mt-3 text-sm">
              Publish stories, manage episodes, and grow worlds through an intentional author workflow.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
