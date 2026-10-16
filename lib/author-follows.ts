import type { Prisma } from "@prisma/client";
import { checkCanFollow, FOLLOWERS_PAGE_SIZE, FOLLOWERS_PREVIEW_COUNT } from "@/lib/author-follow-rules";
import { failure, isUsableId, type EngagementFailure } from "@/lib/engagement";
import { prisma } from "@/lib/prisma";

/*
 * Following a WRITER (Sweep B2; replaces the device-only localStorage list).
 * Rows are AuthorFollow (followerId -> authorId). The follow belongs to the
 * follower's reading profile (Library > People); a writer's public profile
 * shows its followers, never who the writer follows.
 *
 * Both actions are safe to repeat. Follower counts are counted on read
 * (indexed); nothing is stored on the writer.
 */

/** Roles that can be followed (writers: Writer, Board, CEO). */
const WRITER_ROLES: Prisma.UserWhereInput = { role: { in: ["WRITER", "BOARD", "CEO"] } };

/** A member with no active ban or discipline (lib/admin/members.ts uses the same rule). */
function notRestricted(now: Date): Prisma.UserWhereInput {
  return { restrictions: { none: { liftedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: now } }] } } };
}

type FollowResult = { ok: true; following: boolean; followerCount: number } | EngagementFailure;

export async function followAuthor(followerId: string, authorId: unknown): Promise<FollowResult> {
  if (!isUsableId(authorId)) return failure(404, "NOT_FOUND", "That writer isn't available to follow.");
  const author = await prisma.user.findUnique({ where: { id: authorId }, select: { id: true, role: true } });
  const check = checkCanFollow(followerId, author);
  if (!check.ok) return failure(check.status, check.code, check.message);

  // ON CONFLICT DO NOTHING: a repeat follow keeps one row.
  await prisma.authorFollow.createMany({ data: [{ followerId, authorId }], skipDuplicates: true });
  return { ok: true, following: true, followerCount: await authorFollowerCount(authorId) };
}

/** Unfollow. Allowed whatever the writer's state, so members can always tidy up. */
export async function unfollowAuthor(followerId: string, authorId: unknown): Promise<FollowResult> {
  if (!isUsableId(authorId)) return failure(404, "NOT_FOUND", "That writer wasn't found.");
  await prisma.authorFollow.deleteMany({ where: { followerId, authorId } });
  return { ok: true, following: false, followerCount: await authorFollowerCount(authorId) };
}

/** Everyone following the writer, listed or not. */
export function authorFollowerCount(authorId: string) {
  return prisma.authorFollow.count({ where: { authorId } });
}

export async function isFollowingAuthor(followerId: string, authorId: string) {
  const row = await prisma.authorFollow.findUnique({
    where: { followerId_authorId: { followerId, authorId } },
    select: { followerId: true },
  });
  return Boolean(row);
}

/**
 * Follows saved on a device before follows moved to the account: follows each
 * id that is a writer other than the member. Returns how many were added.
 */
export async function importDeviceFollows(followerId: string, ids: string[]) {
  if (ids.length === 0) return 0;
  const writers = await prisma.user.findMany({
    where: { id: { in: ids.filter((id) => id !== followerId) }, ...WRITER_ROLES },
    select: { id: true },
  });
  if (writers.length === 0) return 0;
  const created = await prisma.authorFollow.createMany({
    data: writers.map((writer) => ({ followerId, authorId: writer.id })),
    skipDuplicates: true,
  });
  return created.count;
}

export type PersonEntry = {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
  writerStatus: string;
  followedAt: string;
};

/**
 * The writers a member follows (their Library > People), newest follow first.
 * Members who are no longer writers are hidden; the follow is kept.
 */
export async function listFollowedAuthors(followerId: string): Promise<PersonEntry[]> {
  const rows = await prisma.authorFollow.findMany({
    where: { followerId, author: WRITER_ROLES },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      author: { select: { id: true, name: true, image: true, role: true, writerStatus: true } },
    },
  });
  return rows.map(({ createdAt, author }) => ({ ...author, followedAt: createdAt.toISOString() }));
}

export type FollowerEntry = { id: string; name: string | null; image: string | null; role: string; writerStatus: string };

const followerSelect = { id: true, name: true, image: true, role: true, writerStatus: true } satisfies Prisma.UserSelect;

/** Followers who chose to be listed (and aren't restricted), newest first. Never emails or anything private. */
function listedFollowersWhere(authorId: string, now: Date): Prisma.AuthorFollowWhereInput {
  return { authorId, follower: { followerListVisibility: "PUBLIC", ...notRestricted(now) } };
}

/** The writer profile's Followers section: the total count and the first few listed followers. */
export async function getFollowersPreview(authorId: string, now = new Date()) {
  const [count, rows, listedCount] = await Promise.all([
    authorFollowerCount(authorId),
    prisma.authorFollow.findMany({
      where: listedFollowersWhere(authorId, now),
      orderBy: { createdAt: "desc" },
      take: FOLLOWERS_PREVIEW_COUNT,
      select: { follower: { select: followerSelect } },
    }),
    prisma.authorFollow.count({ where: listedFollowersWhere(authorId, now) }),
  ]);
  return { count, listedCount, followers: rows.map((row) => row.follower) };
}

/** One page (1-based) of listed followers for /author/[id]/followers. */
export async function listFollowersPage(authorId: string, page: number, now = new Date()) {
  const where = listedFollowersWhere(authorId, now);
  const [count, listedCount, rows] = await Promise.all([
    authorFollowerCount(authorId),
    prisma.authorFollow.count({ where }),
    prisma.authorFollow.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { followerId: "asc" }],
      skip: (page - 1) * FOLLOWERS_PAGE_SIZE,
      take: FOLLOWERS_PAGE_SIZE,
      select: { follower: { select: followerSelect } },
    }),
  ]);
  return {
    count,
    listedCount,
    pageCount: Math.max(1, Math.ceil(listedCount / FOLLOWERS_PAGE_SIZE)),
    followers: rows.map((row) => row.follower) as FollowerEntry[],
  };
}
