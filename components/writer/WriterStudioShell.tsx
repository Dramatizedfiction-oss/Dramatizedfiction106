import type { AuthUser } from "@/auth";
import WriterStudioSidebar from "@/components/writer-studio/Sidebar";

export default function WriterStudioShell({
  user,
  children,
}: {
  user: AuthUser | null;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <WriterStudioSidebar user={user}>{children}</WriterStudioSidebar>
    </div>
  );
}
