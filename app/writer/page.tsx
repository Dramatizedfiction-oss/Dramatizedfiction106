import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/utils";

export default async function WriterHome() {
  const session = await auth();
  requireRole(session, ["AUTHOR", "ADMIN", "CEO"]);

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Writer Studio</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/writer/series"
          className="bg-slate-900 p-6 rounded-lg border border-slate-800 hover:border-slate-600 transition"
        >
          <h2 className="text-xl font-semibold">Your Series</h2>
          <p className="text-slate-400 text-sm mt-2">
            Manage and create new series.
          </p>
        </a>

        <a
          href="/writer/episodes"
          className="bg-slate-900 p-6 rounded-lg border border-slate-800 hover:border-slate-600 transition"
        >
          <h2 className="text-xl font-semibold">Your Episodes</h2>
          <p className="text-slate-400 text-sm mt-2">
            View and edit your episodes.
          </p>
        </a>

        <a
          href="/writer/stats"
          className="bg-slate-900 p-6 rounded-lg border border-slate-800 hover:border-slate-600 transition"
        >
          <h2 className="text-xl font-semibold">Stats</h2>
          <p className="text-slate-400 text-sm mt-2">
            Track your reads and performance.
          </p>
        </a>
      </div>
    </main>
  );
}
