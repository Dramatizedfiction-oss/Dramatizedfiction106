/*
 * Profile routing (Sweep 12) end to end against the dev server (the .env.local
 * scratch database): every "Profile" lands on the right account, never another
 * one; writers' profiles have Writing and Reading views; AI-tag reports reach
 * Administration > Reports. Test users are tagged and deleted afterwards.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { deleteAccount } from "@/lib/account-service";
import { hashPassword } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { BASE_URL, TAG, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

type Actor = { id: string; cookie: string; name: string };
let writerA: Actor;
let writerB: Actor;
let readerR: Actor;
let readerS: Actor;
let board: Actor;
let seriesA: string;
let episodeA: string;
let draftSeries: string;
let reachable = false;

async function actor(role: "READER" | "WRITER" | "BOARD", label: string): Promise<Actor> {
  const user = await makeUser(role, label);
  return { id: user.id, cookie: await sessionCookie(user.id), name: `${TAG} ${label}` };
}

function call(path: string, who: Actor | undefined, method = "GET", body?: unknown) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: { ...(who ? { Cookie: who.cookie } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Next 14 redirects with a 307, or a 200 carrying NEXT_REDIRECT once streaming started. Returns the target. */
async function redirectTarget(response: Response) {
  if ([307, 308].includes(response.status)) return response.headers.get("location") ?? "";
  const body = await response.text();
  return /NEXT_REDIRECT;[^;]*;([^;"\\]+)/.exec(body)?.[1] ?? "";
}

const h1 = (html: string) => /<h1[^>]*>([^<]+)<\/h1>/.exec(html)?.[1] ?? "";

before(async () => {
  reachable = await serverReachable();
  writerA = await actor("WRITER", "route-writer-a");
  writerB = await actor("WRITER", "route-writer-b");
  readerR = await actor("READER", "route-reader-r");
  readerS = await actor("READER", "route-reader-s");
  board = await actor("BOARD", "route-board");
  for (const who of [writerA, writerB]) {
    await prisma.authorProfile.create({ data: { userId: who.id, displayName: who.name } });
  }
  const series = await prisma.series.create({
    data: { title: `${TAG} A's series`, description: "Test.", genre: "drama", authorId: writerA.id, aiUsageTag: "AI_FREE", status: "PUBLISHED" },
  });
  seriesA = series.id;
  episodeA = (
    await prisma.episode.create({
      data: {
        title: `${TAG} A's episode`,
        episodeNumber: 1,
        body: "<p>Story.</p>",
        readTime: 1,
        status: "PUBLISHED",
        publishedAt: new Date(),
        seriesId: seriesA,
        authorId: writerA.id,
        aiUsageTag: "AI_FREE",
      },
    })
  ).id;
  draftSeries = (
    await prisma.series.create({
      data: { title: `${TAG} draft`, description: "Test.", genre: "drama", authorId: writerB.id, aiUsageTag: "AI_FREE", status: "DRAFT" },
    })
  ).id;
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

function requireServer(t: { skip: (message: string) => void }) {
  if (!reachable) t.skip(`dev server not reachable at ${BASE_URL}`);
  return reachable;
}

describe("Profile lands on the right account", () => {
  test("a writer's /reader goes to their own author profile; a reader's /reader shows their own page", async (t) => {
    if (!requireServer(t)) return;
    assert.equal(await redirectTarget(await call("/reader", writerA)), `/author/${writerA.id}?view=reading`);
    assert.equal(await redirectTarget(await call("/reader", writerB)), `/author/${writerB.id}?view=reading`);

    const own = await (await call("/reader", readerR)).text();
    assert.equal(h1(own), readerR.name);
    for (const other of [readerS, writerA, writerB]) assert.doesNotMatch(own, new RegExp(`<h1[^>]*>${other.name}<`));
  });

  test("each kind of profile URL sends you to the right kind of profile for that same person", async (t) => {
    if (!requireServer(t)) return;
    assert.equal(await redirectTarget(await call(`/reader/${writerA.id}`, undefined)), `/author/${writerA.id}?view=reading`);
    assert.equal(await redirectTarget(await call(`/author/${readerR.id}`, undefined)), `/reader/${readerR.id}`);

    const authorPage = await (await call(`/author/${writerA.id}`, writerA)).text();
    assert.equal(h1(authorPage), writerA.name);
    assert.match(authorPage, new RegExp(`${TAG} A's series`));
    assert.doesNotMatch(authorPage, new RegExp(`<h1[^>]*>${writerB.name}<`));
  });

  test("comment names link to each commenter's own profile", async (t) => {
    if (!requireServer(t)) return;
    await call("/api/comments", readerR, "POST", { episodeId: episodeA, body: `${TAG} from R` });
    await call("/api/comments", writerB, "POST", { episodeId: episodeA, body: `${TAG} from B` });
    const page = await (await call(`/episode/${episodeA}`, undefined)).text();
    assert.match(page, new RegExp(`href="/reader/${readerR.id}"`));
    assert.match(page, new RegExp(`href="/author/${writerB.id}"`));
    assert.doesNotMatch(page, new RegExp(`href="/reader/${writerB.id}"`));
  });
});

describe("Writing and Reading views", () => {
  test("the owner gets both views; the Reading view is the owner's own data only", async (t) => {
    if (!requireServer(t)) return;
    await call(`/api/me/bookmarks/${episodeA}`, readerR, "PUT"); // someone else's bookmark
    await call(`/api/me/bookmarks/${episodeA}`, writerB, "PUT"); // and another writer's
    const writing = await (await call(`/author/${writerA.id}`, writerA)).text();
    assert.match(writing, /aria-label="Profile view"/);
    assert.match(writing, /aria-current="page"[^>]*>Writing</);

    const reading = await (await call(`/author/${writerA.id}?view=reading`, writerA)).text();
    assert.match(reading, /aria-current="page"[^>]*>Reading</);
    assert.match(reading, /Library/);
    assert.match(reading, /Bookmarks/);
    assert.doesNotMatch(reading, new RegExp(`${TAG} A's episode`), "A has no bookmarks of their own; others' bookmarks never show");
  });

  test("visitors: Writing only while private; Reading appears once something is public", async (t) => {
    if (!requireServer(t)) return;
    const privatePage = await (await call(`/author/${writerA.id}?view=reading`, readerS)).text();
    assert.doesNotMatch(privatePage, /aria-label="Profile view"/, "no switch while nothing is public");
    assert.match(privatePage, new RegExp(`${TAG} A's series`), "falls back to Writing");

    assert.equal((await call("/api/me/profile", writerA, "PATCH", { activityVisibility: "PUBLIC" })).status, 200);
    const publicPage = await (await call(`/author/${writerA.id}?view=reading`, readerS)).text();
    assert.match(publicPage, /aria-label="Profile view"/);
    assert.match(publicPage, /id="activity-heading"/);
    assert.doesNotMatch(publicPage, /id="library-heading"/, "the Library keeps its own (private) setting");
    assert.doesNotMatch(publicPage, /Edit profile/, "the pen is only for the owner");
    assert.match(await (await call(`/author/${writerA.id}`, writerA)).text(), /Edit profile/);
  });
});

describe("AI-tag reports reach Administration", () => {
  test("filing: signed in, published only, not your own, valid tag, once each", async (t) => {
    if (!requireServer(t)) return;
    const path = "/api/reports/ai-tag";
    assert.equal((await call(path, undefined, "POST", { seriesId: seriesA })).status, 401);
    assert.equal((await call(path, readerR, "POST", { seriesId: draftSeries })).status, 404);
    assert.equal((await call(path, readerR, "POST", { seriesId: seriesA, suggestedTag: "AI HEAVY" })).status, 400);
    assert.equal((await call(path, writerA, "POST", { seriesId: seriesA, suggestedTag: "AI_HEAVY" })).status, 403, "own story");

    assert.equal((await call(path, readerR, "POST", { seriesId: seriesA, suggestedTag: "AI_HEAVY", note: `${TAG} looks generated` })).status, 201);
    assert.equal((await call(path, readerR, "POST", { seriesId: seriesA, suggestedTag: "AI_HEAVY" })).status, 200, "repeat changes nothing");
    assert.equal((await call(path, readerS, "POST", { episodeId: episodeA, suggestedTag: null })).status, 201, "episodes can be reported too");
    assert.equal(await prisma.aiTagReport.count({ where: { seriesId: seriesA } }), 2);
  });

  test("Board sees them in Administration › Reports › AI tags and resolves them; others can't", async (t) => {
    if (!requireServer(t)) return;
    const page = await (await call("/administration/reports?kind=ai-tags", board)).text();
    assert.match(page, new RegExp(`${TAG} A&#x27;s series|${TAG} A's series`));
    assert.match(page, new RegExp(`${TAG} looks generated`));

    const report = await prisma.aiTagReport.findFirstOrThrow({ where: { seriesId: seriesA, episodeId: null } });
    assert.equal((await call(`/api/admin/ai-tag-reports/${report.id}`, readerR, "PATCH", { action: "DISMISS" })).status, 403);
    assert.equal((await call(`/api/admin/ai-tag-reports/${report.id}`, writerA, "PATCH", { action: "DISMISS" })).status, 403);
    assert.equal((await call(`/api/admin/ai-tag-reports/${report.id}`, board, "PATCH", { action: "MARK_REVIEWED" })).status, 200);
    assert.equal((await call(`/api/admin/ai-tag-reports/${report.id}`, board, "PATCH", { action: "DISMISS" })).status, 409);
    assert.equal((await prisma.aiTagReport.findUniqueOrThrow({ where: { id: report.id } })).status, "ACTIONED");
    assert.equal(await prisma.adminAuditLog.count({ where: { actorId: board.id, action: "AI_TAG_REPORT_REVIEWED" } }), 1);
    assert.equal((await prisma.series.findUniqueOrThrow({ where: { id: seriesA } })).aiUsageTag, "AI_FREE", "the tag itself is unchanged");
  });

  test("a Board member who reviewed a report on their own series can still delete their account", async (t) => {
    if (!requireServer(t)) return;
    const password = "correct horse battery staple";
    const member = await makeUser("BOARD", "route-board-author");
    await prisma.user.update({ where: { id: member.id }, data: { passwordHash: hashPassword(password) } });
    const own = await prisma.series.create({
      data: { title: `${TAG} board's series`, description: "Test.", genre: "drama", authorId: member.id, aiUsageTag: "AI_FREE", status: "PUBLISHED" },
    });
    await prisma.aiTagReport.create({
      data: { seriesId: own.id, reporterId: readerS.id, status: "ACTIONED", resolvedById: member.id, resolvedAt: new Date() },
    });
    assert.deepEqual(await deleteAccount(member.id, password), { ok: true });
    assert.equal(await prisma.user.findUnique({ where: { id: member.id } }), null);
    assert.equal(await prisma.aiTagReport.count({ where: { seriesId: own.id } }), 0);
  });
});
