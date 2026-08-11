import type { AuthUser } from "@/auth";
import WriterStudioSidebar from "@/components/writer-studio/Sidebar";

export default function WriterStudioShell({
  user,
  children,
  redesignEnabled = false,
}: {
  user: AuthUser | null;
  children: React.ReactNode;
  redesignEnabled?: boolean;
}) {
  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <WriterStudioSidebar user={user} redesignEnabled={redesignEnabled}>
        {children}
      </WriterStudioSidebar>
    </div>
  );
}
