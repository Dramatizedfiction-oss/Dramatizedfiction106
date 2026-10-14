/*
 * Sweep 15 over HTTP (scratch database): the "Continue writing" block on
 * Writer Studio Home and the Studio's "Public profile" visitor view.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "@/lib/prisma";
import { BASE_URL, TAG, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

type Actor = { id: string; cookie: string };
const DAY = 24 * 60 * 60 * 1000;
let withDrafts: Actor;
let idle: Actor;
let busy: Actor;
let fresh: Actor;
let reader: Actor;
let reachable = false;

async function writer(label: string): Promise<Actor> {
  const user = await makeUser("WRITER", label);
  return { id: user.id, cookie: await sessionCookie(user.id) };
}

async function seriesWithEpisodes(authorId: string, title: string, episodes: { status: "DRAFT" | "PUBLISHED"; savedDaysAgo: number }[]) {
  const series = await prisma.series.create({
    data: { title: `${TAG} ${title}`, description: "Test.", genre: "drama", authorId, aiUsageTag: "AI_FREE", status: "PUBLISHED" },
  });
  for (const [index, episode] of episodes.entries()) {
    await prisma.episode.create({
      data: {
        title: `${TAG} ${title} ep${index + 1}`,
        episodeNumber: index + 1,
        body: "<p>Test.</p>",
        readTime: 1,
        seriesId: series.id,
        authorId,
        aiUsageTag: "AI_FREE",
        status: episode.status,
        publishedAt: episode.status === "PUBLISHED" ? new Date() : null,
        lastSavedAt: new Date(Date.now() - episode.savedDaysAgo * DAY),
      },
    });
  }
  return series;
}

const page = async (path: string, who?: Actor) =>
  (await fetch(`${BASE_URL}${path}`, { redirect: "manual", headers: who ? { Cookie: who.cookie } : {} })).text();

before(async () => {
  reachable = await serverReachable();
  withDrafts = await writer("cw-drafts");
  idle = await writer("cw-idle");
  busy = await writer("cw-busy");
  fresh = await writer("cw-fresh");
  reader = { id: (await makeUser("READER", "cw-reader")).id, cookie: "" };
  reader.cookie = await sessionCookie(reader.id);

  await seriesWithEpisodes(withDrafts.id, "Drafty", [
    { status: "PUBLISHED", savedDaysAgo: 20 },
    { status: "DRAFT", savedDaysAgo: 3 },
    { status: "DRAFT", savedDaysAgo: 1 },
  ]);
  await seriesWithEpisodes(idle.id, "Older", [{ status: "PUBLISHED", savedDaysAgo: 30 }]);
  await seriesWithEpisodes(idle.id, "Last touched", [{ status: "PUBLISHED", savedDaysAgo: 10 }]);
  await seriesWithEpisodes(busy.id, "Busy", [{ status: "PUBLISHED", savedDaysAgo: 1 }]);
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

function requireServer(t: { skip: (message: string) => void }) {
  if (!reachable) t.skip(`dev server not reachable at ${BASE_URL}`);
  return reachable;
}

describe("Continue writing block", () => {
  test("a draft: the most recently edited one, with +N more", async (t) => {
    if (!requireServer(t)) return;
    const html = await page("/writer-studio", withDrafts);
    assert.match(html, /Continue writing/);
    assert.match(html, new RegExp(`${TAG} Drafty ep3`), "the newest draft by its last save");
    assert.match(html, /Resume draft/);
    assert.match(html, /\+<!-- -->1<!-- --> more draft|\+1 more draft/);
  });

  test("idle for over a week: the last-worked-on series", async (t) => {
    if (!requireServer(t)) return;
    const html = await page("/writer-studio", idle);
    assert.match(html, /Pick up where you left off/);
    assert.match(html, /Open series/);
    assert.match(html, new RegExp(`id="continue-writing"[\\s\\S]{0,800}${TAG} Last touched`));
  });

  test("written this week with no drafts: no block at all", async (t) => {
    if (!requireServer(t)) return;
    const html = await page("/writer-studio", busy);
    assert.doesNotMatch(html, /id="continue-writing"/);
  });

  test("no series: the first-run guide, no block", async (t) => {
    if (!requireServer(t)) return;
    const html = await page("/writer-studio", fresh);
    assert.match(html, /Your studio is ready/);
    assert.doesNotMatch(html, /id="continue-writing"/);
  });
});

describe("Public profile from the Studio", () => {
  test("the Studio links to the visitor view", async (t) => {
    if (!requireServer(t)) return;
    assert.match(await page("/writer-studio", busy), new RegExp(`href="/author/${busy.id}\\?as=visitor"`));
  });

  test("the owner sees the visitor view with a way back; others see nothing different", async (t) => {
    if (!requireServer(t)) return;
    const preview = await page(`/author/${fresh.id}?as=visitor`, fresh);
    assert.doesNotMatch(preview, /aria-label="Edit profile"/);
    assert.doesNotMatch(preview, /Add your bio|Answer a question for your readers/);
    assert.match(preview, /Back to Studio/);
    assert.match(preview, new RegExp(`href="/author/${fresh.id}\\?edit=1"`));

    const own = await page(`/author/${fresh.id}`, fresh);
    assert.match(own, /aria-label="Edit profile"/, "the plain URL is still the owner view");

    const visitor = await page(`/author/${fresh.id}?as=visitor`, reader);
    assert.doesNotMatch(visitor, /Back to Studio|aria-label="Edit profile"/);
  });
});
