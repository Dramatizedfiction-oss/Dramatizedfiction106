import Link from "next/link";
import AuthorWorksCarousel from "@/components/AuthorWorksCarousel";
import { prisma } from "@/lib/prisma";

const completedBookStatuses = ["PUBLISHED", "PUBLISHED ", "COMPLETED", "FINISHED"];

export default async function AuthorProfilePage({
  params,
}: {
  params: { authorId: string };
}) {
  const author = await prisma.user.findUnique({
    where: { id: params.authorId },
    include: {
      series: {
        orderBy: { updatedAt: "desc" },
        include: {
          episodes: {
            orderBy: { episodeNumber: "asc" },
            take: 1,
          },
        },
      },
      books: {
        orderBy: { createdAt: "desc" },
      },
      episodes: {
        where: {
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

  const displayName = author.name?.trim() || "Dramatized Fiction Author";
  const bio =
    author.bio?.trim() ||
    "This author is building stories on Dramatized Fiction. More identity details can be added over time without leaving the page feeling empty.";

  const socialLinks = [
    { label: "Twitter", href: author.twitterUrl },
    { label: "Instagram", href: author.instagramUrl },
    { label: "YouTube", href: author.youtubeUrl },
    { label: "Website", href: author.websiteUrl },
    { label: "Discord", href: author.discordUrl },
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
      meta: `${series.genre || "Series"} · ${series.episodes.length} episode${series.episodes.length === 1 ? "" : "s"}`,
      badge: "Series",
    })),
    ...wipBooks.map((book) => ({
      id: `book-${book.id}`,
      title: book.title,
      description: book.description,
      coverImage: book.coverUrl,
      href: `/author/${author.id}`,
      meta: book.status || "WIP",
      badge: "Book",
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
  }));

  return (
    <main className="overflow-hidden px-4 py-6 md:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[32px] border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="relative h-48 md:h-72">
          {author.bannerImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={author.bannerImage}
              alt={`${displayName} banner`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.22),transparent_30%),linear-gradient(135deg,rgba(59,130,246,0.16),rgba(15,23,42,0.9))]" />
          )}
        </div>

        <div className="relative px-6 pb-8 md:px-8">
          <div className="-mt-14 flex flex-col gap-6 md:-mt-16 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--bg-secondary)] bg-[var(--bg-primary)] text-3xl font-semibold text-[var(--text-primary)] md:h-32 md:w-32">
                {author.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={author.image}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  displayName.slice(0, 2).toUpperCase()
                )}
              </div>

              <div className="pb-2">
                <p className="eyebrow">Author Profile</p>
                <h1 className="font-heading theme-heading mt-2 text-4xl font-semibold md:text-5xl">
                  {displayName}
                </h1>
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
        />

        <AuthorWorksCarousel
          eyebrow="Archive"
          title="Completed Works"
          items={completedWorks}
          emptyTitle="No completed works yet"
          emptyDescription="Finished books and completed releases will appear here when this author publishes them."
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
                    <div>
                      <p className="theme-heading font-medium">{series.title}</p>
                      <p className="theme-meta mt-1 text-sm">{series.genre}</p>
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
                    <p className="theme-meta mt-1 text-sm">
                      {episode.series.title} · Episode {episode.episodeNumber}
                    </p>
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
