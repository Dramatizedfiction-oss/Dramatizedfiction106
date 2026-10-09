import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import ReaderLibrary from "@/components/reader/ReaderLibrary";
import ReaderProfileHeader, { LockIcon } from "@/components/reader/ReaderProfileHeader";
import { prisma } from "@/lib/prisma";
import { getLibrary } from "@/lib/series-follows";

/*
 * A member's reading profile as others see it, reached only by a direct link
 * (e.g. tapping their name later on a comment). The header (picture, banner,
 * name, bio) is always shown; the content (Library, later sections) only when
 * the member has set readingProfileVisibility to PUBLIC. Not linked from
 * anywhere public and not indexed by search engines.
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
    },
  });
  if (!reader) notFound();

  const session = await auth();
  const isOwner = session?.user?.id === reader.id;
  const isPublic = reader.readingProfileVisibility === "PUBLIC";
  const library = isPublic ? await getLibrary(reader.id) : null;

  return (
    <main className="overflow-hidden md:px-6 md:py-6 lg:px-8">
      <ReaderProfileHeader
        reader={reader}
        note={isOwner ? <p>This is how other people see your reading profile.</p> : undefined}
      />
      <div className="px-4 pt-6 md:px-0 md:pt-8">
        {library ? (
          <section aria-labelledby="library-heading">
            <h2 id="library-heading" className="eyebrow mb-3">
              Library
            </h2>
            <ReaderLibrary entries={library} visitor />
          </section>
        ) : (
          <div className="theme-panel rounded-[24px] border border-dashed border-[var(--border-color)] px-5 py-10 text-center sm:px-8 sm:py-14">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[hsl(var(--series-accent))]">
              <LockIcon />
            </span>
            <h2 className="font-heading theme-heading mt-4 text-balance text-2xl font-semibold">This reading profile is private</h2>
            <p className="theme-meta mx-auto mt-3 max-w-md text-sm leading-6">
              {isOwner
                ? "Your Library is hidden. Switch your reading profile to Public in the profile editor to share it."
                : "This reader keeps their Library to themselves."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
