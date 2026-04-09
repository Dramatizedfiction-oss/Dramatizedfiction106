import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/utils";

export default async function CEODashboard() {
  const session = await auth();
  requireRole(session, ["CEO"]);

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">CEO Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/ceo/settings"
          className="bg-slate-900 p-6 rounded-lg border border-slate-800 hover:border-slate-600 transition"
        >
          <h2 className="text-xl font-semibold">Platform Settings</h2>
          <p className="text-slate-400 text-sm mt-2">
            Control ads, payments, and global configuration.
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
