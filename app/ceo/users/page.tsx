import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";
import UserAvatar from "@/components/UserAvatar";

export default async function CEOUsersPage() {
  const session = await auth();
  requireRole(session, ["CEO"]);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, image: true }
  });

  return (
    <main className="space-y-6 px-4 py-6 md:p-8">
      <h1 className="theme-heading text-3xl font-bold">User Management</h1>

      <div className="space-y-4">
        {users.map(
          (
            u: {
              id: string;
              name: string | null;
              email: string | null;
              role: string;
              image: string | null;
            }
          ) => (
            <div
              key={u.id}
              className="theme-panel flex items-start gap-3 rounded-lg border p-4"
            >
              <UserAvatar user={u} size="md" />
              <div className="min-w-0">
                <p className="theme-heading font-semibold">{u.name || "Unnamed User"}</p>
                <p className="theme-meta break-all text-sm">{u.email}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Role: {u.role}</p>
              </div>
            </div>
          )
        )}
      </div>
    </main>
  );
}
