import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import ReadingView from "@/components/profile/ReadingView";
import ReaderProfileHeader from "@/components/reader/ReaderProfileHeader";
import { prisma } from "@/lib/prisma";
import { isWriterRole, profileHref } from "@/lib/profile-links";

/*
 * A reader's reading profile as others see it, reached by a direct link (e.g.
 * their name on a comment). The header (picture, banner, name, bio) is always
 * shown; the Library only when readingProfileVisibility is PUBLIC, and
 * Activity only when activityVisibility is PUBLIC. Bookmarks are never shown.
 * A writer's profile is their author profile, so writers are redirected to its
 * Reading view. Not indexed by search engines.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PublicReaderProfilePage({ params }: { params: { readerId: string } }) {
  const reader = await prisma.user.findUnique({
    where: { id: params.readerId },
    // Public header fields only (never email, password hash, Stripe ids, role details).
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      writerStatus: true,
      bio: true,
      bannerImage: true,
      createdAt: true,
      readingProfileVisibility: true,
      activityVisibility: true,
    },
  });
  if (!reader) notFound();
  if (isWriterRole(reader.role)) redirect(profileHref(reader, "reading"));

  const session = await auth();
  const isOwner = session?.user?.id === reader.id;

  return (
    <main className="overflow-hidden md:px-6 md:py-6 lg:px-8">
      <ReaderProfileHeader
        reader={reader}
        note={isOwner ? <p>This is how other people see your reading profile.</p> : undefined}
      />
      <div className="px-4 pt-6 md:px-0 md:pt-8">
        {/* Always the visitor's view here, even for the owner ("See what others see"). */}
        <ReadingView member={reader} isOwner={false} />
      </div>
    </main>
  );
}
