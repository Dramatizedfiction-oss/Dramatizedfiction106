import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";
import { getPlatformSettings } from "@/lib/phases";

export default async function CEODashboard() {
  const session = await auth();
  requireRole(session, ["CEO"]);
  const settings = await getPlatformSettings();

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">CEO Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
          <p className="text-sm text-slate-400">Phase 2: Monetization</p>
          <p className="text-lg font-semibold">
            {settings.phaseTwoUnlocked ? "Unlocked" : "Locked"}
          </p>
        </div>

        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
          <p className="text-sm text-slate-400">Phase 3: Ads</p>
          <p className="text-lg font-semibold">
            {settings.phaseThreeUnlocked ? "Unlocked" : "Locked"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/ceo/settings"
          className="bg-slate-900 p-6 rounded-lg border border-slate-800 hover:border-slate-600 transition"
        >
          <h2 className="text-xl font-semibold">Platform Settings</h2>
          <p className="text-slate-400 text-sm mt-2">
            Control site configuration and unlock future phases.
          </p>
        </a>

        <a
          href="/ceo/users"
          className="bg-slate-900 p-6 rounded-lg border border-slate-800 hover:border-slate-600 transition"
        >
          <h2 className="text-xl font-semibold">User Management</h2>
          <p className="text-slate-400 text-sm mt-2">
            View and manage all platform users.
          </p>
        </a>

        <a
          href="/ceo/analytics"
          className="bg-slate-900 p-6 rounded-lg border border-slate-800 hover:border-slate-600 transition"
        >
          <h2 className="text-xl font-semibold">Analytics</h2>
          <p className="text-slate-400 text-sm mt-2">
            Platform-wide stats and performance.
          </p>
        </a>
      </div>
    </main>
  );
}
