import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import AuthorProfileEditor from "@/components/author-profile/AuthorProfileEditor";
import FollowersSection from "@/components/author-profile/FollowersSection";
import WritingSections from "@/components/author-profile/WritingSections";
import FramedAvatar from "@/components/avatar/FramedAvatar";
import FollowAuthorButton from "@/components/follow/FollowAuthorButton";
import ProfileViewSwitch from "@/components/profile/ProfileViewSwitch";
import ReadingView, { readingIsVisible } from "@/components/profile/ReadingView";
import {
  aboutCards,
  getLibraryCards,
  getSeriesOptions,
  onSiteData,
  profileLinks,
  sectionSwitches,
  writingViewSelect,
} from "@/lib/author-profile";
import { followerCountText } from "@/lib/author-follow-rules";
import { getFollowersPreview, isFollowingAuthor } from "@/lib/author-follows";
import { parseLibraryShelf } from "@/lib/library-shelves";
import { prisma } from "@/lib/prisma";
import { isWriterRole, parseProfileView, profileHref } from "@/lib/profile-links";
import { writerStatusLabel } from "@/lib/writer-studio/status";

const EMPTY_ON_SITE = { series: [], seriesTotal: 0, episodes: [], episodesTotal: 0 };

/*
 * A writer's profile (writers are Writer, Board and CEO; everyone else is sent
 * to their reading profile). Two views, chosen in the URL:
 *   - Writing (default, Sweep 14): Bio, Library, About me, On site, Links
 *     (components/author-profile/WritingSections). For visitors a section shows
 *     only when its switch is on and it has content; the owner sees prompts in
 *     empty sections and edits everything in AuthorProfileEditor (the pen).
 *   - Reading (?view=reading): the owner's Library, Bookmarks and Activity; for
 *     anyone else only what the owner made public, and the switch only shows
 *     when something is.
 * Queries (lib/author-profile.ts): one user query with everything the header
 * and sections need, the Library query in parallel, and for the owner the
 * series they can add. Drafts are never shown.
 */
export default async function AuthorProfilePage({
  params,
  searchParams,
}: {
  params: { authorId: string };
  searchParams?: { view?: string; as?: string; edit?: string; shelf?: string };
}) {
  const session = await auth();
  const signedInOwner = session?.user?.id === params.authorId;
  // ?as=visitor (Writer Studio's "Public profile"): the owner sees exactly what
  // visitors see, plus a small bar back to the Studio. For anyone else it
  // changes nothing. Everything below treats a previewing owner as a visitor.
  const previewing = signedInOwner && searchParams?.as === "visitor";
  const isOwner = signedInOwner && !previewing;
  const requested = parseProfileView(searchParams?.view);
  const wantsWriting = requested !== "reading";

  const viewerId = session?.user?.id ?? null;
  const [author, libraryLoaded, seriesOptions, followers, viewerFollows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.authorId },
      // Public profile fields only (never email, password hash, Stripe ids).
      select: {
        id: true,
        name: true,
        bio: true,
        image: true,
        role: true,
        writerStatus: true,
        bannerImage: true,
        readingProfileVisibility: true,
        activityVisibility: true,
        followerListVisibility: true,
        ...writingViewSelect,
      },
    }),
    // The owner's editor always needs the full Library (saving replaces it).
    wantsWriting || isOwner ? getLibraryCards(params.authorId, isOwner) : null,
    isOwner ? getSeriesOptions(params.authorId) : [],
    // Followers (count + the listed few) for the header and the Writing view.
    getFollowersPreview(params.authorId),
    viewerId && !signedInOwner ? isFollowingAuthor(viewerId, params.authorId) : false,
  ]);
  if (!author) notFound();
  // Not a writer: their profile is the reading profile.
  if (!isWriterRole(author.role)) redirect(profileHref(author));

  // A writer always has an author record; create it if it's somehow missing (owner only).
  if (isOwner && !author.authorProfile) {
    await prisma.authorProfile.createMany({
      data: [{ userId: author.id, displayName: author.name?.trim() || "Writer", bio: author.bio, profileImage: author.image }],
      skipDuplicates: true,
    });
  }

  const canSeeReading = isOwner || readingIsVisible(author);
  const view = requested === "reading" && canSeeReading ? "reading" : "writing";
  const ownPath = `/author/${author.id}`;
  const basePath = previewing ? `${ownPath}?as=visitor` : ownPath;
  const displayName = author.name?.trim() || "Dramatized Fiction Author";

  const sections = sectionSwitches(author);
  const about = aboutCards(author);
  const links = profileLinks(author);
  const onSite = onSiteData(author);
  // Asked for Reading but can't see it: the Writing view still needs its Library.
  const library = view === "writing" ? (libraryLoaded ?? (await getLibraryCards(author.id, isOwner))) : [];

  return (
    <main className="overflow-hidden md:px-6 md:py-6 lg:px-8">
      {previewing ? (
        <nav
          aria-label="Visitor preview"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 text-sm md:mb-4 md:rounded-2xl md:border"
        >
          <span className="theme-meta mr-auto basis-full sm:basis-auto">You&apos;re seeing your profile as visitors do.</span>
          <Link href="/writer-studio" className="inline-flex min-h-11 items-center font-semibold text-[var(--text-primary)] underline decoration-1 underline-offset-4">
            ‹ Back to Studio
          </Link>
          <Link href={`${ownPath}?edit=1`} className="inline-flex min-h-11 items-center font-semibold text-[var(--text-primary)] underline decoration-1 underline-offset-4">
            Edit profile
          </Link>
        </nav>
      ) : null}
      <section className="overflow-hidden rounded-[32px] border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="relative h-36 sm:h-48 md:h-72">
          {author.bannerImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.bannerImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_12%_0%,rgba(124,58,237,0.3),transparent_45%),linear-gradient(135deg,var(--accent-soft),var(--bg-primary))]" />
          )}
        </div>

        <div className="relative px-5 pb-6 sm:px-6 md:px-8">
          {/* The owner's profile editor (pen), on either view. */}
          {isOwner ? (
            <div className="absolute right-4 top-3 z-10 sm:right-6 md:right-8">
              <AuthorProfileEditor
                authorId={author.id}
                displayName={displayName}
                role={author.role}
                image={author.image ?? ""}
                bannerImage={author.bannerImage ?? ""}
                readingProfileVisibility={author.readingProfileVisibility}
                activityVisibility={author.activityVisibility}
                followerListVisibility={author.followerListVisibility}
                doc={{ bio: author.bio ?? "", sections, library: libraryLoaded ?? [], about, links }}
                seriesOptions={seriesOptions}
                // Only the Writing view sends its published work along (for the preview).
                onSite={view === "writing" ? onSite : EMPTY_ON_SITE}
                openOnLoad={searchParams?.edit === "1"}
              />
            </div>
          ) : null}
          <div className="-mt-12 flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-end sm:gap-4 md:-mt-16">
            <FramedAvatar
              user={{ image: author.image, role: author.role, writerStatus: author.writerStatus }}
              size="2xl"
              eager
              className="rounded-full bg-[var(--bg-secondary)] p-1"
            />
            <div className="min-w-0 pb-2">
              <p className="eyebrow">{writerStatusLabel(author.writerStatus)}</p>
              <h1 className="font-heading theme-heading mt-2 break-words text-3xl font-semibold sm:text-4xl md:text-5xl">{displayName}</h1>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 empty:hidden">
            {/* Following a writer is a reading-profile action of the visitor (Library > People); never shown to the owner. */}
            {isOwner ? (
              followers.count > 0 ? (
                <span className="theme-meta text-sm">{followerCountText(followers.count)}</span>
              ) : null
            ) : (
              <FollowAuthorButton
                authorId={author.id}
                authorName={displayName}
                initialFollowing={viewerFollows}
                initialCount={followers.count}
                signedIn={Boolean(viewerId)}
                returnPath={view === "reading" ? `${ownPath}?view=reading` : ownPath}
                preview={previewing}
              />
            )}
            {canSeeReading ? <ProfileViewSwitch basePath={basePath} current={view} /> : null}
          </div>
        </div>
      </section>

      <div className="px-4 pb-10 pt-6 md:px-0 md:pt-8">
        {view === "reading" ? (
          <ReadingView member={author} isOwner={isOwner} shelf={parseLibraryShelf(searchParams?.shelf)} />
        ) : (
          <>
            <WritingSections
              mode={isOwner ? "owner" : "visitor"}
              authorId={author.id}
              bio={author.bio}
              sections={sections}
              library={library}
              about={about}
              links={links}
              onSite={onSite}
            />
            <FollowersSection authorId={author.id} {...followers} owner={isOwner} />
          </>
        )}
      </div>
    </main>
  );
}
