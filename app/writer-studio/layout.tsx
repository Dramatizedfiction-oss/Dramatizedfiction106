import { auth } from "@/auth";
import { getWriterStudioContext } from "@/lib/studios";
import { requireWriterStudioAccess } from "@/lib/utils";

// Access gate for everything under /writer-studio. Pages repeat the check via
// requireStudioUser() because layouts don't re-run on client navigation.
// Chrome lives in the (studio) and (focus) route-group layouts.
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

  return <>{children}</>;
}
