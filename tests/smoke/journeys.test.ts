import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/*
 * Smoke suite (Sweep 3): the main journeys for each role, end to end over
 * HTTP, the way a browser does them. Run with `npm run test:smoke` (see
 * scripts/test-smoke.mjs and docs/BUG_AUDIT_REPORT.md). It makes its own
 * accounts and its own published story, so it doesn't depend on seed data,
 * and removes all of it at the end.
 *
 * Browser-only behaviour (console errors, hydration, layout) isn't covered
 * here; the report's phone checklist lists those.
 */

if (process.env.DF_SMOKE !== "1") {
  throw new Error("Smoke tests must be run with `npm run test:smoke` (development database only).");
}

const BASE = process.env.DF_TEST_BASE_URL ?? "http://localhost:3000";
const TAG = `smoke-${Date.now()}-${randomBytes(3).toString("hex")}`;
const DOMAIN = "@smoke.invalid";
const PASSWORD = `Smoke-${randomBytes(12).toString("hex")}`;
const created: string[] = [];

type Reply = { status: number; json: any; text: string; cookie: string | null; location: string | null };

async function call(path: string, options: { method?: string; body?: unknown; cookie?: string | null } = {}): Promise<Reply> {
  const headers: Record<string, string> = {};
  if (options.cookie) headers.cookie = options.cookie;
  if (options.body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(BASE + path, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    redirect: "manual",
  });
  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // pages answer HTML
  }
  const token = /(?:__Secure-)?df\.session-token=([^;]*)/.exec(response.headers.get("set-cookie") ?? "")?.[1];
  return {
    status: response.status,
    json,
    text,
    cookie: token ? `df.session-token=${token}` : null,
    location: response.headers.get("location"),
  };
}

/** A page as a browser lands on it: HTTP redirects, or a redirect streamed inside a 200 page. */
async function page(path: string, cookie?: string | null) {
  const reply = await call(path, { cookie });
  const soft = /NEXT_REDIRECT;(?:replace|push);([^;"\\]+);/.exec(reply.text)?.[1] ?? null;
  return { ...reply, redirectTo: reply.location ? new URL(reply.location, BASE).pathname : soft };
}

async function signUp(label: string) {
  const email = `${TAG}-${label}${DOMAIN}`;
  const reply = await call("/api/auth/register", { method: "POST", body: { name: `Smoke ${label}`, email, password: PASSWORD } });
  assert.equal(reply.status, 201, `sign up ${label}: ${reply.text.slice(0, 200)}`);
  assert.ok(reply.cookie, "sign up sets the session cookie");
  created.push(reply.json.id);
  return { id: reply.json.id as string, email, cookie: reply.cookie! };
}

/** Board/CEO can't be self-assigned, so these get a real session row (the integration tests do the same). */
async function staff(role: "BOARD" | "CEO") {
  const user = await prisma.user.create({
    data: { name: `${TAG} ${role}`, email: `${TAG}-${role.toLowerCase()}${DOMAIN}`, role, writerPolicyAcknowledged: true },
    select: { id: true },
  });
  created.push(user.id);
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({ data: { sessionToken: token, userId: user.id, expires: new Date(Date.now() + 3600_000) } });
  return { id: user.id, cookie: `df.session-token=${token}` };
}

let reachable = false;
before(async () => {
  try {
    reachable = (await fetch(`${BASE}/api/auth/me`)).ok;
  } catch {
    reachable = false;
  }
});

after(async () => {
  if (created.length) {
    await prisma.adminAuditLog.deleteMany({ where: { OR: [{ actorId: { in: created } }, { targetUserId: { in: created } }] } });
    await prisma.aiTagReport.deleteMany({ where: { OR: [{ reporterId: { in: created } }, { series: { authorId: { in: created } } }] } });
    await prisma.contentReport.deleteMany({ where: { OR: [{ reporterId: { in: created } }, { comment: { userId: { in: created } } }] } });
    await prisma.user.deleteMany({ where: { id: { in: created } } });
  }
  const left = await prisma.user.count({ where: { email: { startsWith: TAG } } });
  await prisma.$disconnect();
  assert.equal(left, 0, "every smoke account is removed");
});

describe("smoke journeys", () => {
  const story = { seriesId: "", episodeId: "", title: `Smoke story ${TAG}` };
  let writer: { id: string; email: string; cookie: string };
  let reader: { id: string; email: string; cookie: string };

  test("server is up", (t) => {
    if (!reachable) t.skip(`No dev server at ${BASE}; start it with npm run dev.`);
    assert.ok(reachable);
  });

  test("signed out: public pages load and private ones send you to sign in", async (t) => {
    if (!reachable) return t.skip();
    for (const path of ["/", "/explore", "/about", "/terms", "/sign-in", "/sign-up"]) {
      const reply = await page(path);
      assert.equal(reply.status, 200, path);
      assert.equal(reply.redirectTo, null, `${path} doesn't redirect`);
    }
    for (const path of ["/writer-studio", "/administration", "/ceo-studio", "/settings/account"]) {
      const reply = await page(path);
      assert.match(reply.redirectTo ?? "", /^\/sign-in/, `${path} → sign in`);
    }
    const me = await call("/api/auth/me");
    assert.deepEqual([me.status, me.json.authenticated], [200, false]);
  });

  test("themed error pages render without a session", async (t) => {
    if (!reachable) return t.skip();
    for (const code of ["401", "403", "404", "429", "500", "503"]) {
      const reply = await page(`/status/${code}`);
      assert.equal(reply.status, 200, `/status/${code}`);
      assert.match(reply.text, /night-desert/, `/status/${code} uses the themed scene`);
    }
    const missing = await page(`/no-such-page-${TAG}`);
    assert.equal(missing.status, 404);
    assert.match(missing.text, /night-desert/);
  });

  test("sign up, sign out, sign in", async (t) => {
    if (!reachable) return t.skip();
    writer = await signUp("writer");
    assert.equal((await call("/api/auth/me", { cookie: writer.cookie })).json.authenticated, true);

    const out = await call("/api/auth/logout", { method: "POST", cookie: writer.cookie });
    assert.equal(out.status, 200);
    assert.equal((await call("/api/auth/me", { cookie: writer.cookie })).json.authenticated, false, "the old cookie no longer works");

    const wrong = await call("/api/auth/login", { method: "POST", body: { email: writer.email, password: "not-the-password" } });
    assert.equal(wrong.status, 401);
    const signIn = await call("/api/auth/login", { method: "POST", body: { email: writer.email, password: PASSWORD } });
    assert.equal(signIn.status, 200);
    assert.ok(signIn.cookie);
    writer.cookie = signIn.cookie!;
    assert.equal((await call("/api/auth/me", { cookie: writer.cookie })).json.authenticated, true);
  });

  test("become a writer, write and publish an episode", async (t) => {
    if (!reachable) return t.skip();
    const become = await call("/api/become-author", { method: "POST", cookie: writer.cookie, body: { displayName: `Smoke writer ${TAG}`, acknowledged: true } });
    assert.equal(become.status, 200, become.text.slice(0, 200));
    assert.equal((await page("/writer-studio", writer.cookie)).redirectTo, null, "Studio opens for the new writer");

    const series = await call("/api/writer-studio/series", {
      method: "POST",
      cookie: writer.cookie,
      body: { title: story.title, genre: "Fantasy", description: "A smoke-test story." },
    });
    assert.equal(series.status, 200, series.text.slice(0, 200));
    story.seriesId = series.json.series.id;

    const episode = await call("/api/writer-studio/episodes", { method: "POST", cookie: writer.cookie, body: { seriesId: story.seriesId } });
    assert.equal(episode.status, 200);
    story.episodeId = episode.json.episode.id;

    const save = await call(`/api/writer-studio/episodes/${story.episodeId}`, {
      method: "PATCH",
      cookie: writer.cookie,
      body: { title: "Smoke episode one", body: "<p>The first line of the smoke story.</p><p>Emoji 🌙, ไทย, ລາວ, 中文, العربية.</p>" },
    });
    assert.equal(save.status, 200);
    assert.equal((await page(`/writer-studio/episodes/${story.episodeId}`, writer.cookie)).status, 200, "editor opens");

    const publish = await call(`/api/writer-studio/episodes/${story.episodeId}/publish`, { method: "POST", cookie: writer.cookie, body: {} });
    assert.equal(publish.status, 200, publish.text.slice(0, 200));
  });

  test("browse: the published series and episode open for anyone", async (t) => {
    if (!reachable) return t.skip();
    const seriesPage = await page(`/series/${story.seriesId}`);
    assert.equal(seriesPage.status, 200);
    assert.ok(seriesPage.text.includes(story.title), "series page shows the title");
    const episodePage = await page(`/episode/${story.episodeId}`);
    assert.equal(episodePage.status, 200);
    assert.ok(episodePage.text.includes("The first line of the smoke story."), "episode text renders");
    assert.ok(episodePage.text.includes("ລາວ"), "non-Latin text survives");
    assert.equal((await page(`/author/${writer.id}`)).status, 200, "the writer's profile opens");
  });

  test("reader: rate, bookmark, comment, follow, edit profile", async (t) => {
    if (!reachable) return t.skip();
    reader = await signUp("reader");
    const rate = await call(`/api/me/ratings/${story.episodeId}`, { method: "PUT", cookie: reader.cookie, body: { value: 4 } });
    assert.deepEqual([rate.status, rate.json.value], [200, 4]);
    const again = await call(`/api/me/ratings/${story.episodeId}`, { method: "PUT", cookie: reader.cookie, body: { value: 5 } });
    assert.deepEqual([again.status, again.json.value], [200, 5], "rating again replaces it");
    assert.equal(await prisma.rating.count({ where: { userId: reader.id } }), 1, "one rating per member");

    const own = await call(`/api/me/ratings/${story.episodeId}`, { method: "PUT", cookie: writer.cookie, body: { value: 5 } });
    assert.equal(own.status, 403, "a writer can't rate their own episode");

    const bookmark = await call(`/api/me/bookmarks/${story.episodeId}`, { method: "PUT", cookie: reader.cookie });
    assert.deepEqual([bookmark.status, bookmark.json.bookmarked], [200, true]);

    const comment = await call("/api/comments", { method: "POST", cookie: reader.cookie, body: { episodeId: story.episodeId, body: "Loved it 🌙" } });
    assert.equal(comment.status, 201);
    const repeat = await call("/api/comments", { method: "POST", cookie: reader.cookie, body: { episodeId: story.episodeId, body: "Loved it 🌙" } });
    assert.equal(repeat.status, 200, "a double tap returns the same comment");
    assert.equal(repeat.json.comment.id, comment.json.comment.id);

    const follow = await call(`/api/me/follows/${story.seriesId}`, { method: "PUT", cookie: reader.cookie });
    assert.equal(follow.status, 200);
    const followWriter = await call(`/api/me/author-follows/${writer.id}`, { method: "PUT", cookie: reader.cookie });
    assert.equal(followWriter.json.following, true);

    const profile = await call("/api/me/profile", { method: "PATCH", cookie: reader.cookie, body: { bio: "Smoke reader bio" } });
    assert.equal(profile.status, 200);
    assert.equal((await page("/reader", reader.cookie)).status, 200, "own reader profile opens");
    assert.equal((await page("/settings/account", reader.cookie)).redirectTo, null, "Settings opens");
  });

  test("a reader can't reach Studio or Administration", async (t) => {
    if (!reachable) return t.skip();
    assert.equal((await page("/writer-studio", reader.cookie)).redirectTo, "/become-author");
    assert.equal((await page("/administration", reader.cookie)).redirectTo, "/status/403");
    assert.equal((await page("/ceo-studio", reader.cookie)).redirectTo, "/status/403");
    const api = await call(`/api/admin/feed/series/${story.seriesId}`, { method: "PATCH", cookie: reader.cookie, body: { moderationStatus: "HELD" } });
    assert.equal(api.status, 403, "admin APIs answer JSON 403, not a redirect");
  });

  test("Board: Administration opens and a moderation action works", async (t) => {
    if (!reachable) return t.skip();
    const board = await staff("BOARD");
    const admin = await page("/administration", board.cookie);
    assert.deepEqual([admin.status, admin.redirectTo], [200, null]);
    const hold = await call(`/api/admin/feed/series/${story.seriesId}`, { method: "PATCH", cookie: board.cookie, body: { moderationStatus: "HELD", note: "smoke" } });
    assert.equal(hold.status, 200, hold.text.slice(0, 200));
    const release = await call(`/api/admin/feed/series/${story.seriesId}`, { method: "PATCH", cookie: board.cookie, body: { moderationStatus: "VISIBLE" } });
    assert.equal(release.status, 200);
    assert.equal((await page("/ceo-studio", board.cookie)).redirectTo, "/status/403", "Board never gets CEO Studio");
  });

  test("CEO: CEO Studio opens", async (t) => {
    if (!reachable) return t.skip();
    const ceo = await staff("CEO");
    const studio = await page("/ceo-studio", ceo.cookie);
    assert.deepEqual([studio.status, studio.redirectTo], [200, null]);
    assert.equal((await page("/administration", ceo.cookie)).redirectTo, null);
  });
});
