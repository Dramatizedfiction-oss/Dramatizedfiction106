export default function WriterStudioNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Notifications</p>
        <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold">
          Studio alerts stay in one quiet workspace
        </h2>
        <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
          Editorial updates, collaborator nudges, and system messages can live here
          later without dragging authors into a separate admin-feeling dashboard.
        </p>
      </div>

      <div className="theme-panel rounded-[24px] border border-dashed border-[var(--border-color)] p-6">
        <p className="theme-meta text-sm">
          No studio notifications yet. This panel is ready for creator-facing alerts.
        </p>
      </div>
    </div>
  );
}
