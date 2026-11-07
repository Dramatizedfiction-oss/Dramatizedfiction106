import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/*
 * Fake data for the phone checker (Sweep 4), made on the DEVELOPMENT
 * database only (scripts/test-phone.mjs refuses otherwise) through the same
 * HTTP routes a browser uses, so it exercises real validation. Every account
 * uses the @phone-check.invalid domain and is removed by `removeFixtures`,
 * together with everything hanging off it.
 *
 * It covers the edge cases the brief lists: a series with a very long title,
 * one unbroken 60-letter word, a long author name, three tags, two seasons
 * (one with a single episode), long episode titles, Thai / Lao / Chinese /
 * Arabic text, a long URL and a long word in a comment, and a reader with
 * nothing saved (the empty states).
 */

export const PHONE_DOMAIN = "@phone-check.invalid";

const LONG_WORD = "Supercalifragilisticexpialidociousnessnotwithstandingtogether";
const LONG_URL = "https://example.invalid/a/very/long/path/that/never/breaks/anywhere/on/a/small/phone/screen?with=query&and=more";
const WORLD_TEXT = "<p>ภาษาไทย ทดสอบการตัดคำในย่อหน้าที่ยาวมากบนโทรศัพท์ ພາສາລາວ ທົດສອບ 中文测试段落在手机上的换行 النص العربي للاختبار على الهاتف</p>";

export type Account = { id: string; cookie: string; name: string };
export type Fixtures = {
  cookieName: string;
  writer: Account;
  reader: Account;
  emptyReader: Account;
  board: Account;
  ceo: Account;
  seriesId: string;
  episodeIds: string[];
  singleSeriesId: string;
};

export function createContext(base: string) {
  const tag = `phone-${Date.now()}-${randomBytes(3).toString("hex")}`;
  const password = `Phone-${randomBytes(12).toString("hex")}`;
  let cookieName = "df.session-token";

  async function call(path: string, options: { method?: string; body?: unknown; cookie?: string } = {}) {
    const response = await fetch(base + path, {
      method: options.method ?? "GET",
      headers: {
        ...(options.cookie ? { cookie: options.cookie } : {}),
        ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      redirect: "manual",
    });
    const text = await response.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // HTML
    }
    const match = /((?:__Secure-)?df\.session-token)=([^;]*)/.exec(response.headers.get("set-cookie") ?? "");
    if (match) cookieName = match[1];
    if (response.status >= 400) throw new Error(`${options.method ?? "GET"} ${path} → ${response.status}: ${text.slice(0, 200)}`);
    return { json, token: match?.[2] ?? null };
  }

  async function signUp(label: string, name: string): Promise<Account> {
    const reply = await call("/api/auth/register", {
      method: "POST",
      body: { name, email: `${tag}-${label}${PHONE_DOMAIN}`, password },
    });
    return { id: reply.json.id, cookie: `${cookieName}=${reply.token}`, name };
  }

  /** Board and CEO can't be self-assigned: a user row and a session row, as the integration tests do. */
  async function staff(role: "BOARD" | "CEO", name: string): Promise<Account> {
    const user = await prisma.user.create({
      data: { name, email: `${tag}-${role.toLowerCase()}${PHONE_DOMAIN}`, role, writerPolicyAcknowledged: true },
      select: { id: true },
    });
    const token = randomBytes(32).toString("hex");
    await prisma.session.create({ data: { sessionToken: token, userId: user.id, expires: new Date(Date.now() + 6 * 3600_000) } });
    return { id: user.id, cookie: `${cookieName}=${token}`, name };
  }

  async function create(): Promise<Fixtures> {
    // Names stay within the 40-character rule but use no spaces where it hurts most.
    const writer = await signUp("writer", "Maximiliana Wolfeschlegelsteinhausenberg");
    await call("/api/become-author", {
      method: "POST",
      cookie: writer.cookie,
      body: { displayName: "Maximiliana Wolfeschlegelsteinhausenberg", acknowledged: true },
    });

    const series = await call("/api/writer-studio/series", {
      method: "POST",
      cookie: writer.cookie,
      body: {
        title: `The Extraordinarily Long Chronicle of ${LONG_WORD} and the Lighthouse Keepers of the Northern Archipelago`.slice(0, 150),
        genre: "Fantasy",
        description: `A phone-check series. ${LONG_WORD} ${LONG_URL} ${"A sentence that goes on for a while. ".repeat(20)}`,
      },
    });
    const seriesId: string = series.json.series.id;
    await call(`/api/writer-studio/series/${seriesId}`, {
      method: "PATCH",
      cookie: writer.cookie,
      body: { tags: ["Slow burn", "Found family", "Enemies to lovers"] },
    });

    const episodeIds: string[] = [];
    const addEpisode = async (title: string, body: string, seasonId?: string) => {
      const episode = await call("/api/writer-studio/episodes", {
        method: "POST",
        cookie: writer.cookie,
        body: { seriesId, ...(seasonId ? { seasonId } : {}) },
      });
      const id: string = episode.json.episode.id;
      await call(`/api/writer-studio/episodes/${id}`, {
        method: "PATCH",
        cookie: writer.cookie,
        body: { title, body, description: `Episode description with ${LONG_WORD}.`, readTime: 4 },
      });
      await call(`/api/writer-studio/episodes/${id}/publish`, { method: "POST", cookie: writer.cookie, body: {} });
      episodeIds.push(id);
      return id;
    };

    const paragraphs = Array.from({ length: 24 }, (_, i) => `<p>Paragraph ${i + 1}. ${"The tide came in slowly over the black rocks. ".repeat(4)}</p>`).join("");
    await addEpisode(
      `The Night the ${LONG_WORD} Lighthouse Went Dark Over the Water`.slice(0, 200),
      `<h2>Part one</h2>${paragraphs}<hr>${WORLD_TEXT}<blockquote><p>${LONG_URL}</p></blockquote><hr>${paragraphs}`,
    );
    for (let i = 2; i <= 5; i += 1) await addEpisode(`Episode ${i}: a title that is long enough to need two lines on a phone`, paragraphs);
    const season = await call(`/api/writer-studio/series/${seriesId}/seasons`, {
      method: "POST",
      cookie: writer.cookie,
      body: { title: "The Second Season With a Long Name", description: "One episode only." },
    });
    await addEpisode("The only episode of season two", paragraphs, season.json.season.id);

    // A one-episode series (and a draft left unpublished for the Studio lists).
    const single = await call("/api/writer-studio/series", {
      method: "POST",
      cookie: writer.cookie,
      body: { title: "One", genre: "Mystery", description: "Short." },
    });
    const singleSeriesId: string = single.json.series.id;
    const only = await call("/api/writer-studio/episodes", { method: "POST", cookie: writer.cookie, body: { seriesId: singleSeriesId } });
    await call(`/api/writer-studio/episodes/${only.json.episode.id}`, { method: "PATCH", cookie: writer.cookie, body: { title: "Only", body: "<p>Short.</p>" } });
    await call(`/api/writer-studio/episodes/${only.json.episode.id}/publish`, { method: "POST", cookie: writer.cookie, body: {} });
    await call("/api/writer-studio/episodes", { method: "POST", cookie: writer.cookie, body: { seriesId: singleSeriesId } });

    const reader = await signUp("reader", "Reader With A Rather Long Display Name");
    const first = episodeIds[0];
    await call(`/api/me/bookmarks/${first}`, { method: "PUT", cookie: reader.cookie });
    await call(`/api/me/ratings/${first}`, { method: "PUT", cookie: reader.cookie, body: { value: 5 } });
    await call(`/api/me/follows/${seriesId}`, { method: "PUT", cookie: reader.cookie });
    await call(`/api/me/author-follows/${writer.id}`, { method: "PUT", cookie: reader.cookie });
    await call(`/api/me/progress/${first}`, { method: "PUT", cookie: reader.cookie, body: { percent: 40 } });
    for (const body of [`${LONG_WORD} ${LONG_URL}`, "ภาษาไทย ພາສາລາວ 中文 العربية", "Short one."]) {
      await call("/api/comments", { method: "POST", cookie: reader.cookie, body: { episodeId: first, body } });
    }

    const emptyReader = await signUp("empty", "Em");
    const board = await staff("BOARD", "Board Member Phone Check");
    const ceo = await staff("CEO", "CEO Phone Check");

    return { cookieName, writer, reader, emptyReader, board, ceo, seriesId, episodeIds, singleSeriesId };
  }

  return { tag, create, call, get cookieName() { return cookieName; } };
}

/** Removes every phone-check account and everything attached; returns how many are left (should be 0). */
export async function removeFixtures() {
  const users = await prisma.user.findMany({ where: { email: { endsWith: PHONE_DOMAIN } }, select: { id: true } });
  const ids = users.map((user) => user.id);
  if (ids.length) {
    await prisma.adminAuditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { targetUserId: { in: ids } }] } });
    await prisma.aiTagReport.deleteMany({ where: { OR: [{ reporterId: { in: ids } }, { series: { authorId: { in: ids } } }] } });
    await prisma.contentReport.deleteMany({ where: { OR: [{ reporterId: { in: ids } }, { comment: { userId: { in: ids } } }] } });
    await prisma.readEvent.deleteMany({ where: { userId: { in: ids } } });
    await prisma.studio.deleteMany({ where: { ownerId: { in: ids }, kind: "PERSONAL" } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  return prisma.user.count({ where: { email: { endsWith: PHONE_DOMAIN } } });
}
