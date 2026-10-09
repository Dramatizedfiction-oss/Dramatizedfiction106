import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ReaderLibrary from "@/components/reader/ReaderLibrary";
import ReaderProfileHeader from "@/components/reader/ReaderProfileHeader";
import ReaderProfileTabs from "@/components/reader/ReaderProfileTabs";
import { prisma } from "@/lib/prisma";
import { getLibrary } from "@/lib/series-follows";
import { requireRole } from "@/lib/utils";

/*
 * The signed-in member's own reader page. Private by design: there is no
 * /reader/[id] route, so nobody can view another reader's page until a
 * visibility decision is made. Library lists the member's followed series;
 * Bookmarks and Activity are still "Coming soon" shells.
 */
export default async function ReaderProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/reader");
  // Signed in and not restricted (banned/disciplined members go to /account-restricted).
  requireRole(session, ["READER"]);

  const reader = await prisma.user.findUnique({
    where: { id: session.user.id },
    // Own profile fields only.
    select: { name: true, image: true, role: true, bio: true, bannerImage: true, createdAt: true },
  });
  if (!reader) redirect("/sign-in?callbackUrl=/reader");

  // Only the signed-in member's own follows; never another member's.
  const library = await getLibrary(session.user.id);

  return (
    <main className="overflow-hidden md:px-6 md:py-6 lg:px-8">
      <ReaderProfileHeader reader={reader} />
      <div className="px-4 pt-6 md:px-0 md:pt-8">
        <ReaderProfileTabs panels={{ library: <ReaderLibrary entries={library} /> }} />
      </div>
    </main>
  );
}
