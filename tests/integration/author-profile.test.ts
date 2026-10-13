/*
 * Writer profile, Writing view (Sweep 14), end to end over HTTP against the dev
 * server on the .env.local scratch database: the save route's auth, ownership
 * and validation, and what owners and visitors see (empty sections hidden,
 * switches, unpublished series, safe links). Everything created is tagged and
 * removed afterwards.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { prisma } from "@/lib/prisma";
import { BASE_URL, TAG, cleanup, makeUser, serverReachable, sessionCookie } from "./helpers";

type Actor = { id: string; cookie: string };
let writer: Actor;
let other: Actor;
let reader: Actor;
let published: string;
let draft: string;
let othersSeries: string;
let reachable = false;

async function actor(role: "READER" | "WRITER", label: string): Promise<Actor> {
  const user = await makeUser(role, label);
  return { id: user.id, cookie: await sessionCookie(user.id) };
}

function call(path: string, who?: Actor, init: RequestInit = {}) {
  return fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
    ...init,
    headers: { "Content-Type": "application/json", ...(who ? { Cookie: who.cookie } : {}) },
  });
}
const put = (who: Actor | undefined, body: unknown) => call("/api/me/author-profile", who, { method: "PUT", body: JSON.stringify(body) });

const sections = { bio: true, library: true, about: true, onSite: true, links: true };
const doc = (patch: Record<string, unknown> = {}) => ({ bio: "", sections, library: [], about: [], links: [], ...patch });

async function series(authorId: string, title: string, status: "PUBLISHED" | "DRAFT") {
  const row = await prisma.series.create({
    data: { title: `${TAG} ${title}`, description: "Test.", genre: "drama", authorId, aiUsageTag: "AI_FREE", status },
    select: { id: true },
  });
  return row.id;
}

before(async () => {
  reachable = await serverReachable();
  writer = await actor("WRITER", "ap-writer");
  other = await actor("WRITER", "ap-other");
  reader = await actor("READER", "ap-reader");
  published = await series(writer.id, "Lantern", "PUBLISHED");
  draft = await series(writer.id, "Secret draft", "DRAFT");
  othersSeries = await series(other.id, "Not yours", "PUBLISHED");
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

function requireServer(t: { skip: (message: string) => void }) {
  if (!reachable) t.skip(`dev server not reachable at ${BASE_URL}`);
  return reachable;
}

describe("author profile save route", () => {
  test("signed out 401, readers 403, JSON not redirects", async (t) => {
    if (!requireServer(t)) return;
    const anonymous = await put(undefined, doc());
    assert.equal(anonymous.status, 401);
    assert.match(anonymous.headers.get("content-type") ?? "", /json/);
    assert.equal((await put(reader, doc())).status, 403);
  });

  test("validation: schemes, limits, bio links, unknown keys", async (t) => {
    if (!requireServer(t)) return;
    for (const url of ["javascript:alert(1)", "data:text/html,x", "mailto:a@b.co"]) {
      assert.equal((await put(writer, doc({ links: [{ label: "Bad", url, subtext: "" }] }))).status, 400, url);
    }
    assert.equal((await put(writer, doc({ bio: "x".repeat(301) }))).status, 400);
    assert.equal((await put(writer, doc({ bio: "find me at https://example.com" }))).status, 400);
    const thirteen = Array.from({ length: 13 }, () => ({ kind: "BOOK", title: "B", note: "", url: "", coverImage: "" }));
    assert.equal((await put(writer, doc({ library: thirteen }))).status, 400);
    assert.equal((await put(writer, { ...doc(), userId: other.id })).status, 400, "no user id accepted");
  });

  test("series: own and published only; covers only from the cover uploader", async (t) => {
    if (!requireServer(t)) return;
    assert.equal((await put(writer, doc({ library: [{ kind: "SERIES", seriesId: othersSeries }] }))).status, 400);
    assert.equal((await put(writer, doc({ library: [{ kind: "SERIES", seriesId: draft }] }))).status, 400);
    const outside = { kind: "BOOK", title: "B", note: "", url: "", coverImage: "https://evil.example/x.webp" };
    assert.equal((await put(writer, doc({ library: [outside] }))).status, 400);
  });

  test("saves everything in order, then reorders and removes by id", async (t) => {
    if (!requireServer(t)) return;
    const first = await put(
      writer,
      doc({
        bio: `${TAG} writes  lantern stories.`,
        library: [
          { kind: "BOOK", title: `${TAG} Ember`, note: "Book one.", url: "amazon.com/dp/1", coverImage: "" },
          { kind: "SERIES", seriesId: published },
        ],
        about: [{ prompt: "What made you start writing?", answer: `${TAG} answer` }],
        links: [
          { label: `${TAG} Newsletter`, url: "https://example.substack.com", subtext: "Free prequel" },
          { label: `${TAG} Shop`, url: "https://www.amazon.com/dp/2", subtext: "" },
        ],
      }),
    );
    assert.equal(first.status, 200);
    const { profile } = await first.json();
    assert.equal(profile.bio, `${TAG} writes lantern stories.`);
    assert.equal(profile.library[0].url, "https://amazon.com/dp/1");
    assert.equal(profile.library[1].series.id, published);

    // Reverse the links and drop the About card: ids are kept, nothing is duplicated.
    const [a, b] = profile.links;
    const second = await put(
      writer,
      doc({
        bio: profile.bio,
        library: [{ id: profile.library[0].key, kind: "BOOK", title: `${TAG} Ember`, note: "Book one.", url: "https://amazon.com/dp/1", coverImage: "" }, { id: profile.library[1].key, kind: "SERIES", seriesId: published }],
        about: [],
        links: [
          { id: b.key, label: b.label, url: b.url, subtext: "" },
          { id: a.key, label: a.label, url: a.url, subtext: a.subtext },
        ],
      }),
    );
    assert.equal(second.status, 200);
    const links = await prisma.profileLink.findMany({ where: { userId: writer.id }, orderBy: { position: "asc" } });
    assert.deepEqual(links.map((link) => link.id), [b.key, a.key]);
    assert.equal(await prisma.profileAboutCard.count({ where: { userId: writer.id } }), 0);
    assert.equal(await prisma.profileLibraryItem.count({ where: { userId: writer.id } }), 2);
  });

  test("another writer can't touch these rows, even with their ids", async (t) => {
    if (!requireServer(t)) return;
    const mine = await prisma.profileLink.findMany({ where: { userId: writer.id } });
    const response = await put(other, doc({ links: [{ id: mine[0].id, label: "Hijack", url: "https://a.co", subtext: "" }] }));
    assert.equal(response.status, 200);
    const after = await prisma.profileLink.findUniqueOrThrow({ where: { id: mine[0].id } });
    assert.equal(after.userId, writer.id);
    assert.notEqual(after.label, "Hijack");
    assert.equal(await prisma.profileLink.count({ where: { userId: other.id, label: "Hijack" } }), 1, "saved as the other writer's own new link");
    await put(other, doc());
  });
});

describe("author profile page", () => {
  test("visitors see filled sections with safe links; empty ones don't render", async (t) => {
    if (!requireServer(t)) return;
    const page = await (await call(`/author/${writer.id}`, reader)).text();
    assert.match(page, new RegExp(`${TAG} writes lantern stories.`));
    assert.match(page, /id="profile-library"/);
    assert.match(page, new RegExp(`${TAG} Ember`));
    assert.match(page, /id="profile-links"/);
    assert.match(page, /rel="noopener noreferrer nofollow"/);
    assert.match(page, />example.substack.com</, "the domain is shown");
    assert.doesNotMatch(page, /id="profile-about"/, "empty About is not rendered");
    assert.doesNotMatch(page, /Add your bio|Showcase your books|Hidden from visitors/);
    assert.doesNotMatch(page, /aria-label="Edit profile"/);

    const empty = await (await call(`/author/${other.id}`, reader)).text();
    for (const id of ["profile-bio", "profile-library", "profile-about", "profile-links"]) {
      assert.doesNotMatch(empty, new RegExp(`id="${id}"`), id);
    }
    assert.match(empty, /id="profile-on-site"/, "On site fills automatically");
  });

  test("the owner sees prompts in empty sections and the pen", async (t) => {
    if (!requireServer(t)) return;
    const page = await (await call(`/author/${other.id}`, other)).text();
    assert.match(page, /aria-label="Edit profile"/);
    assert.match(page, /Add your bio/);
    assert.match(page, /Answer a question for your readers/);
  });

  test("a switched-off section is hidden from visitors, labelled for the owner", async (t) => {
    if (!requireServer(t)) return;
    const current = await prisma.profileLink.findMany({ where: { userId: writer.id }, orderBy: { position: "asc" } });
    const items = await prisma.profileLibraryItem.findMany({ where: { userId: writer.id }, orderBy: { position: "asc" } });
    const library = items.map((item) =>
      item.kind === "BOOK"
        ? { id: item.id, kind: "BOOK", title: item.title, note: item.note ?? "", url: item.url ?? "", coverImage: item.coverImage ?? "" }
        : { id: item.id, kind: "SERIES", seriesId: item.seriesId },
    );
    const links = current.map((link) => ({ id: link.id, label: link.label, url: link.url, subtext: link.subtext ?? "" }));
    assert.equal((await put(writer, doc({ bio: `${TAG} writes lantern stories.`, library, links, sections: { ...sections, links: false } }))).status, 200);

    const visitor = await (await call(`/author/${writer.id}`, reader)).text();
    assert.doesNotMatch(visitor, /id="profile-links"/);
    const owner = await (await call(`/author/${writer.id}`, writer)).text();
    assert.match(owner, /id="profile-links"/);
    assert.match(owner, /Hidden from visitors/);
  });

  test("an unpublished series leaves the Library for visitors; a deleted one leaves it entirely", async (t) => {
    if (!requireServer(t)) return;
    await prisma.series.update({ where: { id: published }, data: { status: "DRAFT" } });
    const visitor = await (await call(`/author/${writer.id}`, reader)).text();
    assert.doesNotMatch(visitor, new RegExp(`href="/series/${published}"`));
    const owner = await (await call(`/author/${writer.id}`, writer)).text();
    assert.match(owner, /Unpublished · hidden from visitors/);

    await prisma.series.delete({ where: { id: published } });
    assert.equal(await prisma.profileLibraryItem.count({ where: { userId: writer.id, kind: "SERIES" } }), 0);
  });

  test("See all lists published work only, paginated", async (t) => {
    if (!requireServer(t)) return;
    const page = await (await call(`/author/${other.id}/works?tab=series`)).text();
    assert.match(page, new RegExp(`${TAG} Not yours`));
    const writerWorks = await (await call(`/author/${writer.id}/works?tab=series`)).text();
    assert.doesNotMatch(writerWorks, /Secret draft/);
  });

  test("deleting the account removes every section row", async () => {
    const temp = await makeUser("WRITER", "ap-temp");
    await prisma.profileLink.create({ data: { userId: temp.id, position: 0, label: "x", url: "https://a.co" } });
    await prisma.profileAboutCard.create({ data: { userId: temp.id, position: 0, prompt: "q", answer: "a" } });
    await prisma.profileLibraryItem.create({ data: { userId: temp.id, position: 0, kind: "BOOK", title: "t" } });
    await prisma.user.delete({ where: { id: temp.id } });
    const left = await Promise.all([
      prisma.profileLink.count({ where: { userId: temp.id } }),
      prisma.profileAboutCard.count({ where: { userId: temp.id } }),
      prisma.profileLibraryItem.count({ where: { userId: temp.id } }),
    ]);
    assert.deepEqual(left, [0, 0, 0]);
  });
});
