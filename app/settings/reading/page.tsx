import ReadingPreferences from "@/components/settings/ReadingPreferences";
import { SettingsPageHeader, SettingsSection } from "@/components/settings/SettingsUi";
import ThemePreferenceControl from "@/components/settings/ThemePreferenceControl";

/* Settings > Reading & Appearance: device-only preferences (no account needed). */
export default function ReadingSettingsPage() {
  return (
    <main className="px-4 py-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <SettingsPageHeader title="Reading & Appearance" description="These choices are saved on this device." />

        <SettingsSection title="Theme">
          <ThemePreferenceControl />
        </SettingsSection>

        <SettingsSection title="Reading" description="Applies to the episode reader and the Writer Studio preview.">
          <ReadingPreferences />
        </SettingsSection>
      </div>
    </main>
  );
}
