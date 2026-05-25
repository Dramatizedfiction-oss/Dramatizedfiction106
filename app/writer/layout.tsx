import { auth } from "@/auth";
import WriterStudioShell from "@/components/writer/WriterStudioShell";
import { requireRole } from "@/lib/utils";

export default async function WriterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  requireRole(session, ["WRITER"]);

  return <WriterStudioShell user={session?.user ?? null}>{children}</WriterStudioShell>;
}
