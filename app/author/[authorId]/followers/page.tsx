import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FollowerGrid } from "@/components/author-profile/FollowersSection";
import { followerCountText } from "@/lib/author-follow-rules";
import { listFollowersPage } from "@/lib/author-follows";
import { prisma } from "@/lib/prisma";
import { isWriterRole, profileHref } from "@/lib/profile-links";

export const metadata: Metadata = { title: "Followers", robots: { index: false } };

/*
 * "See all" from a writer profile's Followers section (Sweep B2): followers
 * who chose to be listed, newest first, 30 per page. The count includes
 * everyone. Only picture and display name are shown.
 */
export default async function AuthorFollowersPage({
  params,
  searchParams,
}: {
  params: { authorId: string };
  searchParams?: { page?: string };
}) {
  const author = await prisma.user.findUnique({ where: { id: params.authorId }, select: { id: true, name: true, role: true } });
  if (!author) notFound();
  if (!isWriterRole(author.role)) redirect(profileHref(author));

  const requested = Math.max(1, Math.min(500, Number.parseInt(searchParams?.page ?? "1", 10) || 1));
  const { count, listedCount, pageCount, followers } = await listFollowersPage(author.id, requested);
  if (requested > pageCount) redirect(`/author/${author.id}/followers?page=${pageCount}`);
  const page = requested;
  const name = author.name?.trim() || "This writer";
  const base = `/author/${author.id}/followers`;
  const unlisted = count - listedCount;

  return (
    <main className="px-4 py-6 md:px-6 lg:px-8">
      <Link href={`/author/${author.id}`} className="theme-meta inline-flex min-h-11 items-center text-sm font-semibold hover:text-[var(--text-primary)]">
        ‹ {name}
      </Link>
      <h1 className="font-heading theme-heading mt-1 text-3xl font-semibold">Followers</h1>
      <p className="theme-meta mt-2 text-sm">
        {followerCountText(count)}
        {unlisted > 0 && listedCount > 0 ? ` · ${unlisted.toLocaleString("en-US")} not listed` : ""}
      </p>

      {followers.length === 0 ? (
        <p className="theme-meta mt-8 text-sm">
          {count === 0 ? "No followers yet." : "None of this writer's followers have chosen to be listed."}
        </p>
      ) : (
        <div className="mt-6">
          <FollowerGrid followers={followers} />
        </div>
      )}

      {pageCount > 1 ? (
        <nav aria-label="Pages" className="mt-8 flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link href={`${base}?page=${page - 1}`} className="story-button-secondary min-h-11">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="theme-meta text-sm">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={`${base}?page=${page + 1}`} className="story-button-secondary min-h-11">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </main>
  );
}
