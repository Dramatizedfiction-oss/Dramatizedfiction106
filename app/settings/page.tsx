export default function SettingsPage() {
  return (
    <main className="p-8 md:p-10">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">Settings</p>
        <h1 className="font-heading mt-3 text-5xl font-semibold text-white">
          Platform settings
        </h1>
        <p className="mt-4 max-w-2xl text-slate-400">
          This is the shared settings entry point for the unified sidebar. It can grow into account, reading, notifications, and appearance controls without changing the navigation system.
        </p>

        <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <p className="text-sm text-slate-300">
            Current foundation: theme controls live in the shell, and this page is ready for deeper preferences when you expand Phase 1.
          </p>
        </div>
      </div>
    </main>
  );
}
