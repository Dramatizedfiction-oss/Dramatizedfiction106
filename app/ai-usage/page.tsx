export default function AIUsagePage() {
  return (
    <main className="p-8 md:p-10">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">AI Usage</p>
        <h1 className="font-heading theme-heading mt-3 text-5xl font-semibold">
          How AI fits into the platform
        </h1>
        <p className="theme-meta mt-4 max-w-3xl">
          AI is used as a support layer for platform building and workflow assistance, not as a replacement for creator voice. This page exists as a permanent sidebar destination, not a modal, so policy and transparency can expand over time.
        </p>

        <div className="mt-8 space-y-4">
          <div className="theme-panel rounded-[28px] border p-6">
            <h2 className="theme-heading text-xl font-semibold">Platform assistance</h2>
            <p className="theme-meta mt-3 text-sm">
              AI may help with drafting interface copy, organizing workflows, and supporting internal tooling.
            </p>
          </div>

          <div className="theme-panel rounded-[28px] border p-6">
            <h2 className="theme-heading text-xl font-semibold">Creator authorship</h2>
            <p className="theme-meta mt-3 text-sm">
              The creative identity of published work should stay grounded in the author, with AI treated as assistive rather than authoritative.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
