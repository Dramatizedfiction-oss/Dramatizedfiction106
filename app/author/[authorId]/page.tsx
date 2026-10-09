import Link from "next/link";
import { auth } from "@/auth";
import AiTagBanner from "@/components/AiTagBanner";
import AuthorTierBadge from "@/components/AuthorTierBadge";
import AuthorWorksCarousel from "@/components/AuthorWorksCarousel";
import FollowAuthorButton from "@/components/follow/FollowAuthorButton";
import ProfileEditor from "@/components/profile/ProfileEditor";
import UserAvatar from "@/components/UserAvatar";
import { safeProfileLink } from "@/lib/profile";
import { hasRoleAccess } from "@/lib/roles";
import { deriveAuthorTier, derivePostingConsistency } from "@/lib/author-tier";
import { PUBLIC_EPISODE_WHERE, PUBLIC_SERIES_WHERE } from "@/lib/content-visibility";
import { createViewerMonetizationState } from "@/lib/monetization";
import { prisma } from "@/lib/prisma";

const completedBookStatuses = ["PUBLISHED", "PUBLISHED ", "COMPLETED", "FINISHED"];

export default async function AuthorProfilePage({
  params,
}: {
  params: { authorId: string };
}) {
  const session = await auth();
  const author = await prisma.user.findUnique({
    where: { id: params.authorId },
    // Public profile fields only (never email, password hash, Stripe ids).
    // `role` is read only to pick the default picture; it is never displayed.
    select: {
      id: true,
      name: true,
      bio: true,
      image: true,
      role: true,
      bannerImage: true,
      twitterUrl: true,
      instagramUrl: true,
      youtubeUrl: true,
      websiteUrl: true,
      discordUrl: true,
      // Only passed on to the owner's profile editor; never shown here.
      readingProfileVisibility: true,
      // Public profile: published work only.
      series: {
        where: PUBLIC_SERIES_WHERE,
        orderBy: { updatedAt: "desc" },
        include: {
          episodes: {
            where: { status: "PUBLISHED" },
            orderBy: { episodeNumber: "asc" },
            take: 1,
            select: { id: true },
          },
        },
      },
      books: {
        orderBy: { createdAt: "desc" },
      },
      episodes: {
        where: {
          ...PUBLIC_EPISODE_WHERE,
          locked: false,
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: {
          series: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  if (!author) {
    return <p className="theme-body p-8">Author not found.</p>;
  }

  const viewer = createViewerMonetizationState(session?.user?.id);
  const totalReads = author.series.reduce((sum, series) => sum + series.reads, 0);
  const totalFollowers = author.series.reduce((sum, series) => sum + series.followers, 0);
  const totalEpisodes = author.series.reduce((sum, series) => sum + series.episodes.length, 0);
  const engagementRate = Math.min(0.95, (totalFollowers / Math.max(totalReads, 1)) * 4);
  const authorTier = deriveAuthorTier({
    totalReads,
    engagementRate,
    postingConsistency: derivePostingConsistency(totalReads, totalEpisodes, totalFollowers),
    completionRate: Math.min(0.96, 0.42 + Math.min(totalEpisodes, 16) * 0.025),
  });

  const displayName = author.name?.trim() || "Dramatized Fiction Author";
  const bio =
    author.bio?.trim() ||
    "This author is building stories on Dramatized Fiction. More identity details can be added over time without leaving the page feeling empty.";

  // Only http(s) addresses become links.
  const socialLinks = [
    { label: "Twitter", href: safeProfileLink(author.twitterUrl) },
    { label: "Instagram", href: safeProfileLink(author.instagramUrl) },
    { label: "YouTube", href: safeProfileLink(author.youtubeUrl) },
    { label: "Website", href: safeProfileLink(author.websiteUrl) },
    { label: "Discord", href: safeProfileLink(author.discordUrl) },
  ].filter((item) => Boolean(item.href));

  const completedBooks = author.books.filter((book) =>
    completedBookStatuses.includes(book.status.toUpperCase()),
  );
  const wipBooks = author.books.filter(
    (book) => !completedBookStatuses.includes(book.status.toUpperCase()),
  );

  const wipWorks = [
    ...author.series.map((series) => ({
      id: `series-${series.id}`,
      title: series.title,
      description: series.description,
      coverImage: series.coverImage,
      href: `/series/${series.id}`,
      meta: `${series.genre || "Series"} | ${series.episodes.length} episode${series.episodes.length === 1 ? "" : "s"}`,
      badge: "Series",
      aiUsageTag: series.aiUsageTag,
      monetization: {
        contentType: "series" as const,
        id: series.id,
        isFree: true,
        isLocked: false,
        price: null,
        creatorId: series.authorId,
      },
    })),
    ...wipBooks.map((book) => ({
      id: `book-${book.id}`,
      title: book.title,
      description: book.description,
      coverImage: book.coverUrl,
      href: `/author/${author.id}`,
      meta: book.status || "WIP",
      badge: "Book",
      aiUsageTag: null,
    })),
  ];

  const completedWorks = completedBooks.map((book) => ({
    id: `completed-${book.id}`,
    title: book.title,
    description: book.description,
    coverImage: book.coverUrl,
    href: `/author/${author.id}`,
    meta: "Rating placeholder: 4.8/5",
    badge: "Completed",
    aiUsageTag: null,
  }));

  return (
    <main className="overflow-hidden md:px-6 md:py-6 lg:px-8">
      <section className="overflow-hidden rounded-[32px] border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="relative h-36 sm:h-48 md:h-72">
          {author.bannerImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={author.bannerImage}
              alt={`${displayName} banner`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_12%_0%,rgba(124,58,237,0.3),transparent_45%),linear-gradient(135deg,var(--accent-soft),var(--bg-primary))]" />
          )}
        </div>

        <div className="relative px-5 pb-8 sm:px-6 md:px-8">
          {/* The owner's profile editor (pen). Author pages are always public. */}
          {session?.user?.id === author.id ? (
            <div className="absolute right-4 top-3 z-10 sm:right-6 md:right-8">
              <ProfileEditor
                role={author.role}
                isWriter={hasRoleAccess(author.role, "WRITER")}
                initial={{
                  name: author.name ?? "",
                  bio: author.bio ?? "",
                  image: author.image ?? "",
                  bannerImage: author.bannerImage ?? "",
                  readingProfileVisibility: author.readingProfileVisibility,
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
          <div className="-mt-12 flex flex-col gap-6 md:-mt-16 md:flex-row md:items-end md:justify-between">
            {/* Phones: the avatar overlaps the banner and the name sits below it. */}
            <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-end sm:gap-4">
              <UserAvatar
                user={{ image: author.image, role: author.role }}
                size="xl"
                label={displayName}
                className="border-4 border-[var(--bg-secondary)]"
              />

              <div className="min-w-0 pb-2">
                <p className="eyebrow">Author Profile</p>
                <h1 className="font-heading theme-heading mt-2 break-words text-3xl font-semibold sm:text-4xl md:text-5xl">
                  {displayName}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <AuthorTierBadge tier={authorTier} />
                  <FollowAuthorButton authorId={author.id} authorName={displayName} />
                </div>
              </div>
            </div>

            {socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href!}
                    target="_blank"
                    rel="noreferrer"
                    className="story-button-secondary"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <p className="theme-body mt-6 max-w-3xl text-base leading-7 md:text-lg">
            {bio}
          </p>
        </div>
      </section>

      <div className="mt-8 space-y-8">
        <AuthorWorksCarousel
          eyebrow="Works"
          title="WIP Works"
          items={wipWorks}
          emptyTitle="Work in progress shelf is quiet for now"
          emptyDescription="This author has not added active series or WIP books yet, but the shelf is already ready for future work."
          viewer={viewer}
        />

        <AuthorWorksCarousel
          eyebrow="Archive"
          title="Completed Works"
          items={completedWorks}
          emptyTitle="No completed works yet"
          emptyDescription="Finished books and completed releases will appear here when this author publishes them."
          viewer={viewer}
        />

        <section className="glass-panel rounded-[28px] border border-[var(--border-color)] p-6">
          <p className="eyebrow">Platform Content</p>
          <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">
            Published on Dramatized Fiction
          </h2>

          {author.series.length > 0 || author.episodes.length > 0 ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                <h3 className="theme-heading text-xl font-semibold">Series</h3>
                {author.series.map((series) => (
                  <Link
                    key={series.id}
                    href={`/series/${series.id}`}
                    className="theme-panel-hover flex items-center justify-between rounded-[20px] border border-[var(--border-color)] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="theme-heading font-medium">{series.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <AiTagBanner tag={series.aiUsageTag} />
                        <p className="theme-meta text-sm">{series.genre}</p>
                      </div>
                    </div>
                    <span className="theme-meta text-xs">
                      {series.episodes.length} episode{series.episodes.length === 1 ? "" : "s"}
                    </span>
                  </Link>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="theme-heading text-xl font-semibold">Latest Episodes</h3>
                {author.episodes.map((episode) => (
                  <Link
                    key={episode.id}
                    href={`/episode/${episode.id}`}
                    className="theme-panel-hover block rounded-[20px] border border-[var(--border-color)] px-4 py-3"
                  >
                    <p className="theme-heading font-medium">{episode.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <AiTagBanner tag={episode.aiUsageTag} />
                      <p className="theme-meta text-sm">
                        {episode.series.title} | Episode {episode.episodeNumber}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="theme-panel mt-6 rounded-[24px] border border-dashed border-[var(--border-color)] p-6">
              <p className="theme-meta text-sm">
                Published series and episodes will appear here once this author starts releasing work on the platform.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
