import { auth } from "@/auth";
import WriterStudioShell from "@/components/writer/WriterStudioShell";
import { getWriterStudioContext } from "@/lib/studios";
import { requireWriterStudioAccess } from "@/lib/utils";

export default async function WriterStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  requireWriterStudioAccess(session);

  if (session?.user?.id) {
    await getWriterStudioContext(session.user);
  }

  return <WriterStudioShell user={session?.user ?? null}>{children}</WriterStudioShell>;
}
