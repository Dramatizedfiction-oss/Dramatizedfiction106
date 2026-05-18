import { auth } from "@/auth";
import WriterStudioShell from "@/components/writer/WriterStudioShell";
import { getWriterStudioContext } from "@/lib/studios";
import { requireRole } from "@/lib/utils";

export default async function WriterStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  requireRole(session, ["WRITER"]);

  if (session?.user?.id) {
    await getWriterStudioContext(session.user);
  }

  return <WriterStudioShell>{children}</WriterStudioShell>;
}
