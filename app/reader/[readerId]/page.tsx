import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import ReaderActivity from "@/components/reader/ReaderActivity";
import ReaderLibrary from "@/components/reader/ReaderLibrary";
import ReaderProfileHeader, { LockIcon } from "@/components/reader/ReaderProfileHeader";
import { listActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { getLibrary } from "@/lib/series-follows";

/*
 * A member's reading profile as others see it, reached only by a direct link
 * (e.g. tapping their name on a comment). The header (picture, banner, name,
 * bio) is always shown; the Library only when readingProfileVisibility is
 * PUBLIC, and Activity (bookmarks, ratings, comments) only when
 * activityVisibility is PUBLIC. Bookmarks as a list are never shown here. Not
 * linked from anywhere public and not indexed by search engines.
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
      bio: true,
      bannerImage: true,
      createdAt: true,
      readingProfileVisibility: true,
      activityVisibility: true,
    },
  });
  if (!reader) notFound();

  const session = await auth();
  const isOwner = session?.user?.id === reader.id;
  const libraryPublic = reader.readingProfileVisibility === "PUBLIC";
  const activityPublic = reader.activityVisibility === "PUBLIC";
  const [library, activity] = await Promise.all([
    libraryPublic ? getLibrary(reader.id) : null,
    activityPublic ? listActivity(reader.id) : null,
  ]);

  return (
    <main className="overflow-hidden md:px-6 md:py-6 lg:px-8">
      <ReaderProfileHeader
        reader={reader}
        note={isOwner ? <p>This is how other people see your reading profile.</p> : undefined}
      />
      <div className="space-y-8 px-4 pt-6 md:px-0 md:pt-8">
        {library ? (
          <section aria-labelledby="library-heading">
            <h2 id="library-heading" className="eyebrow mb-3">
              Library
            </h2>
            <ReaderLibrary entries={library} visitor />
          </section>
        ) : null}

        {activity ? (
          <section aria-labelledby="activity-heading">
            <h2 id="activity-heading" className="eyebrow mb-3">
              Activity
            </h2>
            <ReaderActivity readerId={reader.id} initial={activity} visitor />
          </section>
        ) : null}

        {!library && !activity ? (
          <div className="theme-panel rounded-[24px] border border-dashed border-[var(--border-color)] px-5 py-10 text-center sm:px-8 sm:py-14">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[hsl(var(--series-accent))]">
              <LockIcon />
            </span>
            <h2 className="font-heading theme-heading mt-4 text-balance text-2xl font-semibold">This reading profile is private</h2>
            <p className="theme-meta mx-auto mt-3 max-w-md text-sm leading-6">
              {isOwner
                ? "Your Library and Activity are hidden. Switch either to Public in the profile editor to share it."
                : "This reader keeps their Library and Activity to themselves."}
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
