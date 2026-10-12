/*
 * Bookmarks, ratings, comments, reports and Activity, end to end over HTTP
 * against the dev server (the .env.local scratch database). Test users and
 * their series are tagged and deleted afterwards (deleting a user cascades
 * their series, episodes, bookmarks, ratings and comments).
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "@/lib/prisma";
import { BASE_URL, TAG, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

type Actor = { id: string; cookie: string };
let writer: Actor;
let reader: Actor;
let other: Actor;
let third: Actor;
let banned: Actor;
let board: Actor;
let seriesId: string;
let episodeA: string;
let episodeB: string;
let draftEpisode: string;
let reachable = false;

async function actor(role: "READER" | "WRITER" | "BOARD", label: string): Promise<Actor> {
  const user = await makeUser(role, label);
  return { id: user.id, cookie: await sessionCookie(user.id) };
}

function call(path: string, who: Actor | undefined, method = "GET", body?: unknown) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: {
      ...(who ? { Cookie: who.cookie } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function makeEpisode(number: number, status: "PUBLISHED" | "DRAFT") {
  const episode = await prisma.episode.create({
    data: {
      title: `${TAG} episode ${number}`,
      episodeNumber: number,
      body: "<p>Story text.</p>",
      readTime: 3,
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      seriesId,
      authorId: writer.id,
      aiUsageTag: "AI_FREE",
    },
    select: { id: true },
  });
  return episode.id;
}

before(async () => {
  reachable = await serverReachable();
  writer = await actor("WRITER", "eng-writer");
  reader = await actor("READER", "eng-reader");
  other = await actor("READER", "eng-other");
  third = await actor("READER", "eng-third");
  banned = await actor("READER", "eng-banned");
  board = await actor("BOARD", "eng-board");
  await prisma.memberRestriction.create({ data: { userId: banned.id, kind: "BAN", reason: `${TAG} test ban` } });
  const series = await prisma.series.create({
    data: {
      title: `${TAG} engagement series`,
      description: "Integration test series.",
      genre: "drama",
      authorId: writer.id,
      aiUsageTag: "AI_FREE",
      status: "PUBLISHED",
      themeColor: "#ffffff",
    },
    select: { id: true },
  });
  seriesId = series.id;
  episodeA = await makeEpisode(1, "PUBLISHED");
  episodeB = await makeEpisode(2, "PUBLISHED");
  draftEpisode = await makeEpisode(3, "DRAFT");
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

function requireServer(t: { skip: (message: string) => void }) {
  if (!reachable) t.skip(`dev server not reachable at ${BASE_URL}`);
  return reachable;
}

describe("bookmarks", () => {
  test("signed out, banned and unpublished are refused with JSON", async (t) => {
    if (!requireServer(t)) return;
    const anon = await call(`/api/me/bookmarks/${episodeA}`, undefined, "PUT");
    assert.equal(anon.status, 401);
    assert.equal((await anon.json()).code, "UNAUTHENTICATED");
    assert.equal((await call(`/api/me/bookmarks/${episodeA}`, banned, "PUT")).status, 403);
    assert.equal((await call(`/api/me/bookmarks/${draftEpisode}`, reader, "PUT")).status, 404);
    assert.equal((await call("/api/me/bookmarks", undefined)).status, 401);
  });

  test("bookmarking is idempotent and the list is the caller's own, published only", async (t) => {
    if (!requireServer(t)) return;
    for (let i = 0; i < 2; i++) {
      const response = await call(`/api/me/bookmarks/${episodeA}`, reader, "PUT");
      assert.deepEqual(await response.json(), { bookmarked: true });
    }
    assert.equal(await prisma.bookmark.count({ where: { userId: reader.id } }), 1);

    const mine = await (await call("/api/me/bookmarks", reader)).json();
    assert.deepEqual(mine.bookmarks.map((b: { episodeId: string }) => b.episodeId), [episodeA]);
    assert.equal((await (await call("/api/me/bookmarks", other)).json()).bookmarks.length, 0);

    // The episode page shows the saved state; unpublishing hides the bookmark without deleting it.
    assert.match(await (await call(`/episode/${episodeA}`, reader)).text(), /Saved to Bookmarks/);
    await prisma.episode.update({ where: { id: episodeA }, data: { status: "DRAFT" } });
    assert.equal((await (await call("/api/me/bookmarks", reader)).json()).bookmarks.length, 0);
    await prisma.episode.update({ where: { id: episodeA }, data: { status: "PUBLISHED" } });
    assert.equal((await (await call("/api/me/bookmarks", reader)).json()).bookmarks.length, 1);
  });
});

describe("ratings", () => {
  test("whole stars 1-5 only; the author can't rate their own episode", async (t) => {
    if (!requireServer(t)) return;
    for (const value of [0, 6, 4.5, "5"]) {
      assert.equal((await call(`/api/me/ratings/${episodeA}`, reader, "PUT", { value })).status, 400, String(value));
    }
    const own = await call(`/api/me/ratings/${episodeA}`, writer, "PUT", { value: 5 });
    assert.equal(own.status, 403);
    assert.equal((await own.json()).code, "OWN_EPISODE");
    assert.equal((await call(`/api/me/ratings/${draftEpisode}`, reader, "PUT", { value: 5 })).status, 404);
    assert.equal((await call(`/api/me/ratings/${episodeA}`, undefined, "PUT", { value: 5 })).status, 401);
    assert.match(await (await call(`/episode/${episodeA}`, writer)).text(), /You can(&#x27;|')t rate your own episode/);
  });

  test("one rating per reader per episode, changeable; the database also refuses values outside 1-5", async (t) => {
    if (!requireServer(t)) return;
    assert.deepEqual(await (await call(`/api/me/ratings/${episodeA}`, reader, "PUT", { value: 2 })).json(), { value: 2 });
    assert.deepEqual(await (await call(`/api/me/ratings/${episodeA}`, reader, "PUT", { value: 5 })).json(), { value: 5 });
    const rows = await prisma.rating.findMany({ where: { userId: reader.id } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].value, 5);
    await assert.rejects(
      prisma.$executeRaw`INSERT INTO "Rating" ("userId","episodeId","value","updatedAt") VALUES (${other.id}, ${episodeA}, 9, now())`,
    );
  });

  test("the series rating pools every vote and stays hidden below 3 ratings", async (t) => {
    if (!requireServer(t)) return;
    // So far: reader 5 on A. Add other 1 on B: 2 ratings, hidden.
    await call(`/api/me/ratings/${episodeB}`, other, "PUT", { value: 1 });
    assert.doesNotMatch(await (await call(`/series/${seriesId}`, undefined)).text(), /ratings\)/);
    // third 1 on B: votes 5, 1, 1 -> pooled 2.3 (an average of episode averages would say 3.0).
    await call(`/api/me/ratings/${episodeB}`, third, "PUT", { value: 1 });
    const page = await (await call(`/series/${seriesId}`, undefined)).text();
    assert.match(page, /Rated 2\.3 out of 5 from 3 ratings/);
    assert.doesNotMatch(page, /Rated 3\.0/);

    // Clearing a rating removes it from the pool.
    assert.deepEqual(await (await call(`/api/me/ratings/${episodeB}`, third, "DELETE")).json(), { value: null });
    assert.doesNotMatch(await (await call(`/series/${seriesId}`, undefined)).text(), /out of 5 from/);
    await call(`/api/me/ratings/${episodeB}`, third, "PUT", { value: 1 });
  });
});

describe("comments and reports", () => {
  let readerComment: string;

  test("anyone reads; signed-in members post plain text of 1-1,000 characters", async (t) => {
    if (!requireServer(t)) return;
    assert.equal((await call(`/api/comments?episodeId=${episodeA}`, undefined)).status, 200);
    assert.equal((await call(`/api/comments?episodeId=${draftEpisode}`, undefined)).status, 404);
    assert.equal((await call("/api/comments", undefined, "POST", { episodeId: episodeA, body: "hi" })).status, 401);
    assert.equal((await call("/api/comments", banned, "POST", { episodeId: episodeA, body: "hi" })).status, 403);
    assert.equal((await call("/api/comments", reader, "POST", { episodeId: episodeA, body: "   " })).status, 400);
    assert.equal((await call("/api/comments", reader, "POST", { episodeId: episodeA, body: "x".repeat(1001) })).status, 400);
    assert.equal((await call("/api/comments", reader, "POST", { episodeId: draftEpisode, body: "hi" })).status, 404);

    const html = `<script>alert(1)</script> ${TAG} first`;
    const posted = await call("/api/comments", reader, "POST", { episodeId: episodeA, body: `  ${html}  ` });
    assert.equal(posted.status, 201);
    const comment = (await posted.json()).comment;
    assert.equal(comment.body, html);
    readerComment = comment.id;

    // A double tap returns the same comment instead of a second one.
    const repeat = await call("/api/comments", reader, "POST", { episodeId: episodeA, body: html });
    assert.equal(repeat.status, 200);
    assert.equal((await repeat.json()).comment.id, readerComment);
    assert.equal(await prisma.comment.count({ where: { userId: reader.id } }), 1);

    const page = await (await call(`/episode/${episodeA}`, undefined)).text();
    assert.match(page, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/, "rendered escaped");
    assert.doesNotMatch(page, /<script>alert\(1\)<\/script>/);
    assert.match(page, /Sign in to comment/);
  });

  test("posting is rate-limited", async (t) => {
    if (!requireServer(t)) return;
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await call("/api/comments", third, "POST", { episodeId: episodeB, body: `${TAG} burst ${i}` })).status);
    }
    assert.deepEqual(statuses.slice(0, 5), [201, 201, 201, 201, 201]);
    const limited = statuses[5];
    assert.equal(limited, 429);
  });

  test("only the author edits or deletes; the series author and Board remove", async (t) => {
    if (!requireServer(t)) return;
    assert.equal((await call(`/api/comments/${readerComment}`, other, "PATCH", { body: "hijack" })).status, 404);
    const edited = await call(`/api/comments/${readerComment}`, reader, "PATCH", { body: `${TAG} edited` });
    assert.equal(edited.status, 200);
    assert.ok((await edited.json()).comment.editedAt);
    assert.equal((await call(`/api/comments/${readerComment}`, other, "DELETE")).status, 403);

    // The series author removes: hidden, kept for its reports.
    const otherPost = await (await call("/api/comments", other, "POST", { episodeId: episodeA, body: `${TAG} other` })).json();
    const removed = await call(`/api/comments/${otherPost.comment.id}`, writer, "DELETE");
    assert.deepEqual(await removed.json(), { outcome: "removed" });
    const row = await prisma.comment.findUniqueOrThrow({ where: { id: otherPost.comment.id } });
    assert.ok(row.removedAt);
    const visible = await (await call(`/api/comments?episodeId=${episodeA}`, undefined)).json();
    assert.ok(!visible.comments.some((c: { id: string }) => c.id === otherPost.comment.id));
    assert.equal((await call(`/api/comments/${otherPost.comment.id}`, other, "PATCH", { body: "back" })).status, 404);

    // The author deletes their own outright.
    const mine = await (await call("/api/comments", other, "POST", { episodeId: episodeB, body: `${TAG} mine` })).json();
    assert.deepEqual(await (await call(`/api/comments/${mine.comment.id}`, other, "DELETE")).json(), { outcome: "deleted" });
    assert.equal(await prisma.comment.count({ where: { id: mine.comment.id } }), 0);
  });

  test("reports: not your own, once per member, reviewed by Board who can remove or dismiss", async (t) => {
    if (!requireServer(t)) return;
    assert.equal((await call(`/api/comments/${readerComment}/report`, reader, "POST", { reason: "SPAM" })).status, 403);
    assert.equal((await call(`/api/comments/${readerComment}/report`, other, "POST", { reason: "NOPE" })).status, 400);
    for (let i = 0; i < 2; i++) {
      assert.equal((await call(`/api/comments/${readerComment}/report`, other, "POST", { reason: "SPAM", note: "test" })).status, 200);
    }
    assert.equal(await prisma.contentReport.count({ where: { commentId: readerComment } }), 1);
    await call(`/api/comments/${readerComment}/report`, third, "POST", { reason: "HARASSMENT" });
    const reports = await prisma.contentReport.findMany({ where: { commentId: readerComment }, orderBy: { createdAt: "asc" } });

    assert.equal((await call(`/api/admin/reports/${reports[0].id}`, reader, "PATCH", { action: "DISMISS" })).status, 403);
    assert.equal((await call(`/api/admin/reports/${reports[0].id}`, writer, "PATCH", { action: "DISMISS" })).status, 403);
    assert.equal((await call(`/api/admin/reports/${reports[0].id}`, board, "PATCH", { action: "DISMISS" })).status, 200);
    assert.equal((await call(`/api/admin/reports/${reports[0].id}`, board, "PATCH", { action: "DISMISS" })).status, 409);
    assert.match(await (await call("/administration/reports", board)).text(), new RegExp(`${TAG} edited`));

    const removal = await call(`/api/admin/reports/${reports[1].id}`, board, "PATCH", { action: "REMOVE_COMMENT" });
    assert.equal(removal.status, 200);
    assert.ok((await prisma.comment.findUniqueOrThrow({ where: { id: readerComment } })).removedAt);
    assert.equal(await prisma.contentReport.count({ where: { commentId: readerComment, status: "OPEN" } }), 0);
    assert.equal(await prisma.adminAuditLog.count({ where: { actorId: board.id, action: "COMMENT_REMOVED" } }), 1);
    assert.equal(await prisma.adminAuditLog.count({ where: { actorId: board.id, action: "REPORT_DISMISSED" } }), 1);
  });
});

describe("activity and account deletion", () => {
  test("Activity is private by default, owner-only until made public", async (t) => {
    if (!requireServer(t)) return;
    const path = `/api/readers/${third.id}/activity`;
    assert.equal((await call(path, undefined)).status, 403);
    assert.equal((await call(path, other)).status, 403);
    const own = await (await call(path, third)).json();
    assert.ok(own.items.length > 0);
    assert.deepEqual(own.items.map((i: { at: string }) => i.at), [...own.items.map((i: { at: string }) => i.at)].sort().reverse(), "newest first");

    assert.equal((await call("/api/me/profile", third, "PATCH", { activityVisibility: "EVERYONE" })).status, 400);
    assert.equal((await call("/api/me/profile", third, "PATCH", { activityVisibility: "PUBLIC" })).status, 200);
    assert.equal((await call(path, undefined)).status, 200);
    const profile = await (await call(`/reader/${third.id}`, undefined)).text();
    assert.match(profile, /id="activity-heading"/);
    assert.doesNotMatch(profile, /id="library-heading"/, "the Library keeps its own (private) setting");
  });

  test("deleting an account removes their bookmarks, ratings and comments; reports they filed stay, unlinked", async (t) => {
    if (!requireServer(t)) return;
    const filed = await prisma.contentReport.count({ where: { reporterId: other.id } });
    assert.ok(filed > 0);
    await prisma.user.delete({ where: { id: other.id } });
    assert.equal(await prisma.rating.count({ where: { userId: other.id } }), 0);
    assert.equal(await prisma.comment.count({ where: { userId: other.id } }), 0);
    assert.equal(await prisma.bookmark.count({ where: { userId: other.id } }), 0);
    assert.equal(await prisma.contentReport.count({ where: { reporterId: null, comment: { episode: { seriesId } } } }), filed);

    // Deleting the reader removes their (reported) comment and its reports too.
    await prisma.user.delete({ where: { id: reader.id } });
    assert.equal(await prisma.contentReport.count({ where: { comment: { userId: reader.id } } }), 0);
    assert.equal(await prisma.bookmark.count({ where: { userId: reader.id } }), 0);
  });
});
