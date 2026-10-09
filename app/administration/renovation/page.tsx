import { auth } from "@/auth";
import RenovationControl from "@/components/admin/RenovationControl";
import { Panel } from "@/components/admin/ui";
import { formatDate } from "@/lib/admin/format";
import { getPlatformSettings } from "@/lib/phases";
import { isCEO } from "@/lib/roles";
import { requireAdministrationPage } from "@/lib/utils";

export default async function RenovationPage() {
  const user = requireAdministrationPage(await auth(), "/administration/renovation");
  const settings = await getPlatformSettings();

  return (
    <div className="space-y-6">
      <Panel
        title="Renovation Mode"
        description={
          settings.renovationChangedAt ? `Last changed ${formatDate(settings.renovationChangedAt)}.` : "Never turned on."
        }
      >
        <ul className="theme-body list-disc space-y-2 pl-5 text-sm leading-6">
          <li>Everyone except the CEO and Board sees a renovation page instead of the site, on every page.</li>
          <li>All actions are refused on the server for them: reading, writing, publishing, profile changes and new sign-ups.</li>
          <li>Signing in still works, so the CEO and Board can get back in. The CEO and Board keep full access.</li>
          <li>Nothing is deleted. Turning it off reopens the site immediately.</li>
        </ul>
        <div className="mt-5">
          <RenovationControl enabled={settings.renovationMode} canChange={isCEO(user.role)} />
        </div>
      </Panel>
    </div>
  );
}
