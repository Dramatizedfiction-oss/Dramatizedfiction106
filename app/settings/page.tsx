import ThemePreferenceControl from "@/components/settings/ThemePreferenceControl";

export default function SettingsPage() {
  return (
    <main className="md:p-10">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">Settings</p>
        <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold md:text-5xl">Settings</h1>

        <section className="theme-panel mt-8 rounded-[28px] border p-5 sm:p-6">
          <h2 className="theme-heading text-xl font-semibold">Appearance</h2>
          <p className="theme-meta mt-1 text-sm">Choose how Dramatized Fiction looks on this device.</p>
          <div className="mt-5">
            <ThemePreferenceControl />
          </div>
        </section>
      </div>
    </main>
  );
}
