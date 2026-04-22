export default function AIUsagePage() {
  return (
    <main className="p-8 md:p-10">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">AI Usage</p>
        <h1 className="font-heading mt-3 text-5xl font-semibold text-white">
          How AI fits into the platform
        </h1>
        <p className="mt-4 max-w-3xl text-slate-400">
          AI is used as a support layer for platform building and workflow assistance, not as a replacement for creator voice. This page exists as a permanent sidebar destination, not a modal, so policy and transparency can expand over time.
        </p>

        <div className="mt-8 space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold text-white">Platform assistance</h2>
            <p className="mt-3 text-sm text-slate-400">
              AI may help with drafting interface copy, organizing workflows, and supporting internal tooling.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold text-white">Creator authorship</h2>
            <p className="mt-3 text-sm text-slate-400">
              The creative identity of published work should stay grounded in the author, with AI treated as assistive rather than authoritative.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
