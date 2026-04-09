import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/utils";

export default async function CEOUsersPage() {
  const session = await auth();
  requireRole(session, ["CEO"]);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">User Management</h1>

      <div className="space-y-4">
        {users.map((u) => (
          <div
            key={u.id}
            className="bg-slate-900 p-4 rounded-lg border border-slate-800"
          >
            <p className="font-semibold">{u.name || "Unnamed User"}</p>
            <p className="text-slate-400 text-sm">{u.email}</p>
            <p className="text-slate-500 text-xs mt-1">Role: {u.role}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
