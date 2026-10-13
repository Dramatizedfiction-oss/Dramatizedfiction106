import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import AiTagBanner from "@/components/AiTagBanner";
import FramedAvatar from "@/components/avatar/FramedAvatar";
import FollowAuthorButton from "@/components/follow/FollowAuthorButton";
import ProfileEditor from "@/components/profile/ProfileEditor";
import ProfileViewSwitch from "@/components/profile/ProfileViewSwitch";
import ReadingView, { readingIsVisible } from "@/components/profile/ReadingView";
import { PUBLIC_EPISODE_WHERE, PUBLIC_SERIES_WHERE } from "@/lib/content-visibility";
import { prisma } from "@/lib/prisma";
import { safeProfileLink } from "@/lib/profile";
import { isWriterRole, parseProfileView, profileHref } from "@/lib/profile-links";
import { writerStatusLabel } from "@/lib/writer-studio/status";

/*
 * A writer's profile (writers are Writer, Board and CEO; everyone else is sent
 * to their reading profile). Two views, chosen in the URL:
 *   - Writing (default): bio, links, Follow Author, published series and
 *     latest episodes. Always public.
 *   - Reading (?view=reading): the owner's Library, Bookmarks and Activity; for
 *     anyone else only what the owner made public, and the switch only shows
 *     when something is.
 * Everything shown is loaded for the profile's own id; the editor pen shows
 * only to the owner. Drafts are never shown.
 */
export default async function AuthorProfilePage({
  params,
  searchParams,
}: {
  params: { authorId: string };
  searchParams?: { view?: string };
}) {
  const session = await auth();
  const author = await prisma.user.findUnique({
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
      twitterUrl: true,
      instagramUrl: true,
      youtubeUrl: true,
      websiteUrl: true,
      discordUrl: true,
      readingProfileVisibility: true,
      activityVisibility: true,
      authorProfile: { select: { id: true } },
      series: {
        where: PUBLIC_SERIES_WHERE,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          genre: true,
          aiUsageTag: true,
          _count: { select: { episodes: { where: { status: "PUBLISHED" } } } },
        },
      },
      episodes: {
        where: { ...PUBLIC_EPISODE_WHERE, locked: false },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: { id: true, title: true, episodeNumber: true, aiUsageTag: true, series: { select: { title: true } } },
      },
    },
  });
  if (!author) notFound();
  // Not a writer: their profile is the reading profile.
  if (!isWriterRole(author.role)) redirect(profileHref(author));

  const isOwner = session?.user?.id === author.id;
  // A writer always has an author record; create it if it's somehow missing (owner only).
  if (isOwner && !author.authorProfile) {
    await prisma.authorProfile.createMany({
      data: [{ userId: author.id, displayName: author.name?.trim() || "Writer", bio: author.bio, profileImage: author.image }],
      skipDuplicates: true,
    });
  }

  const canSeeReading = isOwner || readingIsVisible(author);
  const requested = parseProfileView(searchParams?.view);
  const view = requested === "reading" && canSeeReading ? "reading" : "writing";
  const basePath = `/author/${author.id}`;

  const displayName = author.name?.trim() || "Dramatized Fiction Author";
  const socialLinks = [
    { label: "Twitter", href: safeProfileLink(author.twitterUrl) },
    { label: "Instagram", href: safeProfileLink(author.instagramUrl) },
    { label: "YouTube", href: safeProfileLink(author.youtubeUrl) },
    { label: "Website", href: safeProfileLink(author.websiteUrl) },
    { label: "Discord", href: safeProfileLink(author.discordUrl) },
  ].filter((item) => Boolean(item.href));

  return (
    <main className="overflow-hidden md:px-6 md:py-6 lg:px-8">
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
              <ProfileEditor
                role={author.role}
                isWriter
                initial={{
                  bio: author.bio ?? "",
                  image: author.image ?? "",
                  bannerImage: author.bannerImage ?? "",
                  readingProfileVisibility: author.readingProfileVisibility,
                  activityVisibility: author.activityVisibility,
                  links: {
                    websiteUrl: author.websiteUrl ?? "",
                    twitterUrl: author.twitterUrl ?? "",
                    instagramUrl: author.instagramUrl ?? "",
                    youtubeUrl: author.youtubeUrl ?? "",
                    discordUrl: author.discordUrl ?? "",
                  },
                }}
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

          {canSeeReading ? (
            <div className="mt-5">
              <ProfileViewSwitch basePath={basePath} current={view} />
            </div>
          ) : null}
        </div>
      </section>

      <div className="px-4 pt-6 md:px-0 md:pt-8">
        {view === "reading" ? (
          <ReadingView member={author} isOwner={isOwner} />
        ) : (
          <div className="space-y-8">
            <section aria-label="About" className="max-w-3xl">
              <p className="theme-body text-base leading-7 md:text-lg">
                {author.bio?.trim() || `${displayName} is writing on Dramatized Fiction.`}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {isOwner ? null : <FollowAuthorButton authorId={author.id} authorName={displayName} />}
                {socialLinks.map((link) => (
                  <a key={link.label} href={link.href!} target="_blank" rel="noreferrer" className="story-button-secondary min-h-11">
                    {link.label}
                  </a>
                ))}
              </div>
            </section>

            <section aria-labelledby="series-heading">
              <h2 id="series-heading" className="font-heading theme-heading text-2xl font-semibold">
                Series
              </h2>
              {author.series.length === 0 ? (
                <p className="theme-meta mt-3 text-sm">Published series will appear here.</p>
              ) : (
                <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {author.series.map((series) => (
                    <li key={series.id} className="min-w-0">
                      <Link
                        href={`/series/${series.id}`}
                        className="theme-panel-hover flex min-h-[72px] items-center justify-between gap-3 rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3"
                      >
                        <span className="min-w-0">
                          <span className="theme-heading block truncate font-medium">{series.title}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <AiTagBanner tag={series.aiUsageTag} />
                            <span className="theme-meta text-sm">{series.genre}</span>
                          </span>
                        </span>
                        <span className="theme-meta shrink-0 text-xs">
                          {series._count.episodes} episode{series._count.episodes === 1 ? "" : "s"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {author.episodes.length > 0 ? (
              <section aria-labelledby="latest-heading">
                <h2 id="latest-heading" className="font-heading theme-heading text-2xl font-semibold">
                  Latest episodes
                </h2>
                <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {author.episodes.map((episode) => (
                    <li key={episode.id} className="min-w-0">
                      <Link
                        href={`/episode/${episode.id}`}
                        className="theme-panel-hover block rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3"
                      >
                        <span className="theme-heading block truncate font-medium">{episode.title}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <AiTagBanner tag={episode.aiUsageTag} />
                          <span className="theme-meta text-sm">
                            {episode.series.title} · Episode {episode.episodeNumber}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
