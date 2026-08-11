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

  const redesignEnabled = process.env.NEXT_PUBLIC_WRITER_STUDIO_REDESIGN === "true";

  return (
    // Pass redesign flag so the client shell can opt-in to the new layout
    <WriterStudioShell user={session?.user ?? null} redesignEnabled={redesignEnabled}>
      {children}
    </WriterStudioShell>
  );
}
