const notifications = [
  {
    id: "note-1",
    title: "Draft reminder",
    body: "Episode drafts that have not been touched in a few days will surface here later.",
  },
  {
    id: "note-2",
    title: "Reader feedback feed",
    body: "Future reactions, comments, and moderation-safe notes can plug into this panel.",
  },
  {
    id: "note-3",
    title: "Publishing checkpoints",
    body: "Series health prompts, AI trust checks, and release reminders can live here without changing the studio shell.",
  },
];

export default function WriterNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Notifications</p>
        <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold">
          Placeholder creator inbox
        </h2>
        <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
          This tab is a lightweight scaffold for future writer alerts and workflow nudges. It is intentionally simple so the navigation pattern can settle before the deeper messaging layer exists.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {notifications.map((item) => (
          <div
            key={item.id}
            className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5"
          >
            <p className="theme-heading text-lg font-semibold">{item.title}</p>
            <p className="theme-body mt-3 text-sm leading-6">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
