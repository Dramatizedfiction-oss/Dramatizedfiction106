/*
 * Sweep I over HTTP against the dev server on the .env.local scratch database:
 * library-avatar focus and frame uploads are Board/CEO only, a member's frame
 * choice is their own and only active frames count, passage comments are
 * checked against the episode's text, and highlights are private to their
 * owner. Everything created is tagged and removed afterwards.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "@/lib/prisma";
import { BASE_URL, TAG, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

type Actor = { id: string; cookie: string };
let reachable = false;
let reader: Actor;
let other: Actor;
let writer: Actor;
let episodeId: string;
let activeFrame: string;
let hiddenFrame: string;

const BODY = "<p>The lighthouse keeper counted ships. She counted them twice.</p><p>Nobody else was counting.</p>";

async function actor(role: "READER" | "WRITER", label: string): Promise<Actor> {
  const user = await makeUser(role, label);
  return { id: user.id, cookie: await sessionCookie(user.id) };
}

function call(path: string, who: Actor | undefined, method = "GET", body?: unknown) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(who ? { Cookie: who.cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

before(async () => {
  reachable = await serverReachable();
  reader = await actor("READER", "i-reader");
  other = await actor("READER", "i-other");
  writer = await actor("WRITER", "i-writer");
  const series = await prisma.series.create({
    data: { title: `${TAG} series`, description: "x", genre: "Mystery", tags: [], authorId: writer.id, aiUsageTag: "AI_FREE", status: "PUBLISHED" },
  });
  const episode = await prisma.episode.create({
    data: {
      title: `${TAG} episode`,
      episodeNumber: 1,
      body: BODY,
      readTime: 1,
      status: "PUBLISHED",
      publishedAt: new Date(),
      seriesId: series.id,
      authorId: writer.id,
      aiUsageTag: "AI_FREE",
    },
  });
  episodeId = episode.id;
  activeFrame = (await prisma.storeItem.create({ data: { category: "FRAME", name: `${TAG} frame`, imageUrl: `https://example.invalid/${TAG}-a.webp` } })).id;
  hiddenFrame = (await prisma.storeItem.create({ data: { category: "FRAME", name: `${TAG} hidden`, imageUrl: `https://example.invalid/${TAG}-h.webp`, active: false } })).id;
});

after(async () => {
  await prisma.storeItem.deleteMany({ where: { name: { startsWith: TAG } } });
  await cleanup();
  await prisma.$disconnect();
});

describe("Sweep I", { skip: false }, () => {
  test("library focus and frame uploads: 401 signed out, 403 below Board", async (t) => {
    if (!reachable) return t.skip("dev server not running");
    const form = () => {
      const data = new FormData();
      data.append("file", new Blob(["<svg xmlns='http://www.w3.org/2000/svg'/>"], { type: "image/svg+xml" }), "f.svg");
      return data;
    };
    for (const [who, status] of [
      [undefined, 401],
      [reader, 403],
      [writer, 403],
    ] as const) {
      const focus = await call("/api/admin/avatars/whatever/focus", who, "PUT", { x: 0.5, y: 0.5, zoom: 1 });
      assert.equal(focus.status, status);
      assert.match(focus.headers.get("content-type") ?? "", /json/);
      const upload = await fetch(`${BASE_URL}/api/admin/store/frames`, { method: "POST", redirect: "manual", headers: who ? { Cookie: who.cookie } : {}, body: form() });
      assert.equal(upload.status, status);
    }
  });

  test("a member chooses only active frames, for their own account", async (t) => {
    if (!reachable) return t.skip("dev server not running");
    assert.equal((await call("/api/me/frame", undefined, "PUT", { choice: "none" })).status, 401);
    assert.equal((await call("/api/me/frame", reader, "PUT", { choice: "store", itemId: hiddenFrame })).status, 404);
    assert.equal((await call("/api/me/frame", reader, "PUT", { choice: "gold" })).status, 400);
    assert.equal((await call("/api/me/frame", reader, "PUT", { choice: "store", itemId: activeFrame })).status, 200);
    let row = await prisma.user.findUniqueOrThrow({ where: { id: reader.id }, select: { selectedFrameId: true, hideLevelFrame: true } });
    assert.deepEqual(row, { selectedFrameId: activeFrame, hideLevelFrame: false });
    assert.equal((await call("/api/me/frame", writer, "PUT", { choice: "none" })).status, 200);
    row = await prisma.user.findUniqueOrThrow({ where: { id: writer.id }, select: { selectedFrameId: true, hideLevelFrame: true } });
    assert.deepEqual(row, { selectedFrameId: null, hideLevelFrame: true });
    // The reader's choice is untouched by the writer's.
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: reader.id } })).selectedFrameId, activeFrame);
  });

  test("passage comments must quote the episode's current text", async (t) => {
    if (!reachable) return t.skip("dev server not running");
    const ok = await call("/api/comments", reader, "POST", {
      episodeId,
      body: "Twice!",
      passage: { quote: "She counted them twice.", prefix: "keeper counted ships. ", suffix: "" },
    });
    assert.equal(ok.status, 201);
    const { comment } = (await ok.json()) as { comment: { id: string; passage: { quote: string; found: boolean } } };
    assert.equal(comment.passage.quote, "She counted them twice.");
    const missing = await call("/api/comments", reader, "POST", { episodeId, body: "Hm", passage: { quote: "Not in the story", prefix: "", suffix: "" } });
    assert.equal(missing.status, 409);
    const tooLong = await call("/api/comments", reader, "POST", { episodeId, body: "Hm", passage: { quote: "x".repeat(301), prefix: "", suffix: "" } });
    assert.equal(tooLong.status, 400);

    const list = (await (await call(`/api/comments?episodeId=${episodeId}`, undefined)).json()) as { comments: { id: string; passage: { found: boolean } | null }[] };
    assert.equal(list.comments.find((item) => item.id === comment.id)?.passage?.found, true);

    // The page draws the passage and its count.
    const html = await (await call(`/episode/${episodeId}?passage=${comment.id}`, undefined)).text();
    assert.match(html, /passage-target/);
    assert.match(html, /class="passage-count"/);

    // The writer changes the text: the comment stays, marked as changed.
    await prisma.episode.update({ where: { id: episodeId }, data: { body: "<p>Rewritten entirely.</p>" } });
    const after = (await (await call(`/api/comments?episodeId=${episodeId}`, undefined)).json()) as { comments: { id: string; passage: { found: boolean } | null }[] };
    assert.equal(after.comments.find((item) => item.id === comment.id)?.passage?.found, false);
    await prisma.episode.update({ where: { id: episodeId }, data: { body: BODY } });
  });

  test("highlights are private to their owner", async (t) => {
    if (!reachable) return t.skip("dev server not running");
    const passage = { quote: "Nobody else was counting.", prefix: "", suffix: "" };
    assert.equal((await call("/api/me/highlights", undefined, "POST", { episodeId, passage })).status, 401);
    const created = await call("/api/me/highlights", reader, "POST", { episodeId, passage, note: "Lonely." });
    assert.equal(created.status, 201);
    const { highlight } = (await created.json()) as { highlight: { id: string; note: string } };
    assert.equal(highlight.note, "Lonely.");

    const mine = (await (await call("/api/me/highlights", reader)).json()) as { highlights: { id: string }[] };
    assert.ok(mine.highlights.some((item) => item.id === highlight.id));
    const theirs = (await (await call("/api/me/highlights", other)).json()) as { highlights: { id: string }[] };
    assert.ok(!theirs.highlights.some((item) => item.id === highlight.id));
    assert.equal((await call(`/api/me/highlights/${highlight.id}`, other, "PATCH", { note: "mine now" })).status, 404);
    assert.equal((await call(`/api/me/highlights/${highlight.id}`, other, "DELETE")).status, 404);

    // Someone else's ?highlight= link doesn't reveal it.
    const othersPage = await (await call(`/episode/${episodeId}?highlight=${highlight.id}`, other)).text();
    assert.doesNotMatch(othersPage, /passage-target/);
    const ownPage = await (await call(`/episode/${episodeId}?highlight=${highlight.id}`, reader)).text();
    assert.match(ownPage, /passage-target/);

    assert.equal((await call(`/api/me/highlights/${highlight.id}`, reader, "PATCH", { note: null })).status, 200);
    assert.equal((await prisma.highlight.findUniqueOrThrow({ where: { id: highlight.id } })).note, null);
    assert.equal((await call(`/api/me/highlights/${highlight.id}`, reader, "DELETE")).status, 200);
    assert.equal(await prisma.highlight.count({ where: { id: highlight.id } }), 0);
  });
});
