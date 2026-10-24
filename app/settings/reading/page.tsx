import ReadingPreferences from "@/components/settings/ReadingPreferences";
import { SettingsGroup, SettingsPageHeader } from "@/components/settings/SettingsUi";
import ThemePreferenceControl from "@/components/settings/ThemePreferenceControl";

export const metadata = { title: "Reading & Appearance" };

/*
 * Settings > Reading & Appearance: device-only preferences (no account
 * needed). Two groups, titled above (Sweep E): the theme as radio rows, then
 * the reading controls, preview and reset as rows of one group.
 */
export default function ReadingSettingsPage() {
  return (
    <main className="px-4 py-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <SettingsPageHeader title="Reading & Appearance" description="These choices are saved on this device." />

        <section className="mt-6" aria-labelledby="theme-title">
          <h2 id="theme-title" className="surface-group-title">
            Theme
          </h2>
          <ThemePreferenceControl />
        </section>

        <SettingsGroup title="Reading" description="Applies to the episode reader and the Writer Studio preview." className="mt-8">
          <ReadingPreferences />
        </SettingsGroup>
      </div>
    </main>
  );
}
