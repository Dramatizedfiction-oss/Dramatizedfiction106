export default function WriterStudioAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Analytics</p>
        <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold">
          Audience signals are ready for the next layer
        </h2>
        <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
          This studio tab keeps analytics inside the same creator workspace so future
          reads, retention, and engagement tools appear without changing navigation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {["Read Trends", "Completion", "Audience Momentum"].map((item) => (
          <div
            key={item}
            className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5"
          >
            <p className="eyebrow">{item}</p>
            <p className="theme-body mt-4 text-sm leading-6">
              Placeholder module ready for future analytics data.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
