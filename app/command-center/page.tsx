import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";

export default async function CommandCenterPage() {
  const session = await auth();
  requireRole(session, ["BOARD"]);

  return (
    <main className="space-y-6 p-8">
      <div>
        <p className="eyebrow">Board Access</p>
        <h1 className="theme-heading mt-3 text-3xl font-bold">Command Center</h1>
        <p className="theme-body mt-3 max-w-2xl text-sm">
          This is the protected leadership layer for board and CEO users. It is
          separated from the writer workflow and can expand into moderation, platform
          health, and operational controls without exposing CEO-only tools.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
          <p className="theme-meta text-xs uppercase tracking-[0.24em]">
            Access Tier
          </p>
          <p className="theme-heading mt-3 text-xl font-semibold">BOARD+</p>
        </div>
        <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
          <p className="theme-meta text-xs uppercase tracking-[0.24em]">
            Route Safety
          </p>
          <p className="theme-heading mt-3 text-xl font-semibold">
            Protected by session role
          </p>
        </div>
        <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
          <p className="theme-meta text-xs uppercase tracking-[0.24em]">
            Next Expansion
          </p>
          <p className="theme-heading mt-3 text-xl font-semibold">
            Moderation and operations
          </p>
        </div>
      </div>
    </main>
  );
}
