import { auth } from "@/auth";
import WriterStudioShell from "@/components/writer/WriterStudioShell";
import { requireWriterStudioAccess } from "@/lib/utils";

export default async function WriterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  requireWriterStudioAccess(session);

  return <WriterStudioShell user={session?.user ?? null}>{children}</WriterStudioShell>;
}
