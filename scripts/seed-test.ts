/*
 * Sweep 17: seeds the removable test catalogue (scripts/seed-test/catalogue.ts).
 *
 *   npm run seed:test            -> main database (.env)
 *   npm run seed:test:scratch    -> scratch copy (.env.local)
 *
 * Safe to run again: accounts are matched by email, series by author + title,
 * episodes by series + number; the test accounts' activity (reads, progress,
 * ratings, bookmarks, follows, comments) is rebuilt from the catalogue each
 * run. Never touches anything that isn't owned by a test account, never
 * changes the schema, roles of real members, settings or phase flags.
 * Remove it all with npm run seed:test:clear.
 */
import { comparePassword, hashPassword } from "@/lib/auth-utils";
import { analyzeEpisodeHtml } from "@/lib/episode-content";
import { NEW_ACCOUNT_HOURS } from "@/lib/feed/config";
import {
  AUTHOR_FOLLOWS,
  BOOKMARKS,
  COMMENTS,
  DRAFT_LAST_SAVED_DAYS_AGO,
  FOLLOWS,
  RATINGS,
  READERS,
  READS,
  SERIES,
  TEST_EMAIL_DOMAIN,
  WRITERS,
  WRITER_A_PROFILE,
  testEmail,
  type AccountKey,
  type SeriesKey,
} from "./seed-test/catalogue";
import cartographersDaughter from "./seed-test/content/cartographers-daughter";
import ghostTax from "./seed-test/content/ghost-tax";
import lighthouseLetters from "./seed-test/content/lighthouse-letters";
import nightShiftMabels from "./seed-test/content/night-shift-mabels";
import ninthFloorAlibi from "./seed-test/content/ninth-floor-alibi";
import orbitNine from "./seed-test/content/orbit-nine";
import quietRation from "./seed-test/content/quiet-ration";
import saltCrown from "./seed-test/content/salt-crown";
import seventeenMinutesLate from "./seed-test/content/seventeen-minutes-late";
import tidecaller from "./seed-test/content/tidecaller";
import whatTheFogKeeps from "./seed-test/content/what-the-fog-keeps";
import zeroHourCourier from "./seed-test/content/zero-hour-courier";
import { announce, resolveTarget, seedPassword } from "./seed-test/target";

const CONTENT: Record<SeriesKey, { title: string; text: string }[]> = {
  "salt-crown": saltCrown,
  tidecaller,
  "orbit-nine": orbitNine,
  "lighthouse-letters": lighthouseLetters,
  "ninth-floor-alibi": ninthFloorAlibi,
  "what-the-fog-keeps": whatTheFogKeeps,
  "zero-hour-courier": zeroHourCourier,
  "cartographers-daughter": cartographersDaughter,
  "night-shift-mabels": nightShiftMabels,
  "seventeen-minutes-late": seventeenMinutesLate,
  "quiet-ration": quietRation,
  "ghost-tax": ghostTax,
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// Every test account is this old (older than any series, the oldest starts 89
// days ago), so its activity isn't "new account" activity to the feed
// (NEW_ACCOUNT_HOURS in lib/feed/config.ts, judged at the time of the action).
const ACCOUNT_AGE_DAYS = 120;

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Paragraphs separated by blank lines; a line of "---" becomes a scene break. */
function toHtml(text: string) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .map((paragraph) => (paragraph === "---" ? "<p>* * *</p>" : `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`))
    .join("");
}

async function main() {
  const target = resolveTarget(process.argv);
  announce(target, "seed:test");
  const password = seedPassword();
  const { prisma } = await import("@/lib/prisma");
  const now = Date.now();
  const passwordHash = hashPassword(password);
  const accountCreatedAt = new Date(now - ACCOUNT_AGE_DAYS * DAY);
  /** Activity must come after the accounts stopped being new, or the feed ignores it. */
  const established = (at: Date, what: string) => {
    if (at.getTime() < accountCreatedAt.getTime() + NEW_ACCOUNT_HOURS * HOUR) throw new Error(`${what} is dated while its account was under ${NEW_ACCOUNT_HOURS} hours old.`);
    return at;
  };

  /* ---------------------------------------------------------- accounts */
  const ids = {} as Record<AccountKey, string>;
  for (const [key, writer] of Object.entries(WRITERS)) {
    const user = await prisma.user.upsert({
      where: { email: testEmail(writer.handle) },
      create: {
        email: testEmail(writer.handle),
        name: writer.name,
        bio: writer.bio,
        role: "WRITER",
        writerStatus: writer.writerStatus,
        writerPolicyAcknowledged: true,
        passwordHash,
        readingProfileVisibility: "PUBLIC",
        createdAt: accountCreatedAt,
      },
      update: {
        name: writer.name,
        bio: writer.bio,
        role: "WRITER",
        writerStatus: writer.writerStatus,
        writerPolicyAcknowledged: true,
        passwordHash,
        createdAt: accountCreatedAt,
      },
      select: { id: true },
    });
    ids[key as AccountKey] = user.id;
    await prisma.authorProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, displayName: writer.name, bio: writer.bio },
      update: { displayName: writer.name, bio: writer.bio },
    });
  }
  for (const [key, reader] of Object.entries(READERS)) {
    const visibility = reader.publicProfile ? "PUBLIC" : "PRIVATE";
    const user = await prisma.user.upsert({
      where: { email: testEmail(reader.handle) },
      create: {
        email: testEmail(reader.handle),
        name: reader.name,
        bio: reader.bio,
        role: "READER",
        passwordHash,
        readingProfileVisibility: visibility,
        activityVisibility: visibility,
        followerListVisibility: visibility,
        createdAt: accountCreatedAt,
      },
      update: {
        createdAt: accountCreatedAt,
        name: reader.name,
        bio: reader.bio,
        role: "READER",
        passwordHash,
        readingProfileVisibility: visibility,
        activityVisibility: visibility,
        followerListVisibility: visibility,
      },
      select: { id: true },
    });
    ids[key as AccountKey] = user.id;
  }
  const testUserIds = Object.values(ids);
  console.log(`Accounts: ${Object.keys(WRITERS).length} writers, ${Object.keys(READERS).length} readers (@${TEST_EMAIL_DOMAIN})`);

  /* ------------------------------------------------- series and episodes */
  const seriesIds = {} as Record<SeriesKey, string>;
  const episodeIds = new Map<string, { id: string; publishedAt: Date | null }>(); // "series:number"
  let episodeCount = 0;

  for (const def of SERIES) {
    const episodes = CONTENT[def.key];
    const authorId = ids[def.author];
    const publishedAt = (n: number) => new Date(now - Math.max(0.25, def.startDaysAgo - (n - 1) * def.everyDays) * DAY);
    const createdAt = new Date(now - (def.startDaysAgo + 1) * DAY);
    const lastActivity = def.published ? publishedAt(episodes.length) : new Date(now - DRAFT_LAST_SAVED_DAYS_AGO * DAY);
    const data = {
      title: def.title,
      description: def.description,
      genre: def.genre,
      tags: def.tags,
      coverImage: def.cover,
      themeColor: def.themeColor,
      status: def.published ? ("PUBLISHED" as const) : ("DRAFT" as const),
      isComplete: def.isComplete,
      aiUsageTag: def.aiUsageTag,
    };
    const existing = await prisma.series.findFirst({ where: { authorId, title: def.title }, select: { id: true } });
    const series = existing
      ? await prisma.series.update({ where: { id: existing.id }, data, select: { id: true } })
      : await prisma.series.create({ data: { ...data, authorId, createdAt }, select: { id: true } });
    seriesIds[def.key] = series.id;

    for (const [index, episode] of episodes.entries()) {
      const n = index + 1;
      const body = toHtml(episode.text);
      const published = def.published ? publishedAt(n) : null;
      const savedAt = published ?? new Date(now - DRAFT_LAST_SAVED_DAYS_AGO * DAY);
      const fields = {
        title: episode.title,
        body,
        readTime: analyzeEpisodeHtml(body).readTime,
        status: def.published ? ("PUBLISHED" as const) : ("DRAFT" as const),
        publishedAt: published,
        lastSavedAt: savedAt,
        aiUsageTag: def.aiUsageTag,
        locked: false,
      };
      const row = await prisma.episode.upsert({
        where: { seriesId_episodeNumber: { seriesId: series.id, episodeNumber: n } },
        create: { ...fields, episodeNumber: n, seriesId: series.id, authorId, createdAt: new Date(savedAt.getTime() - 2 * HOUR) },
        update: fields,
        select: { id: true },
      });
      episodeIds.set(`${def.key}:${n}`, { id: row.id, publishedAt: published });
      episodeCount += 1;
    }
    await prisma.episode.deleteMany({ where: { seriesId: series.id, episodeNumber: { gt: episodes.length } } });
    // Keep the timeline believable (the read counts below would otherwise stamp "now").
    await prisma.series.update({ where: { id: series.id }, data: { updatedAt: lastActivity } });
  }
  console.log(`Series: ${SERIES.length}, episodes: ${episodeCount}`);

  const episodeOf = (series: SeriesKey, n: number) => {
    const found = episodeIds.get(`${series}:${n}`);
    if (!found) throw new Error(`Catalogue refers to ${series} episode ${n}, which doesn't exist.`);
    return found;
  };
  const authorOf = (series: SeriesKey) => ids[SERIES.find((def) => def.key === series)!.author];

  /* ------------------------------------- activity: rebuilt from the catalogue */
  await prisma.$transaction([
    prisma.rating.deleteMany({ where: { userId: { in: testUserIds } } }),
    prisma.bookmark.deleteMany({ where: { userId: { in: testUserIds } } }),
    prisma.comment.deleteMany({ where: { userId: { in: testUserIds } } }),
    prisma.seriesFollow.deleteMany({ where: { userId: { in: testUserIds } } }),
    prisma.authorFollow.deleteMany({ where: { followerId: { in: testUserIds } } }),
    prisma.readingProgress.deleteMany({ where: { userId: { in: testUserIds } } }),
    prisma.readEvent.deleteMany({ where: { userId: { in: testUserIds } } }),
  ]);

  const read = new Set<string>(); // "who:series:n"
  const readEvents: { userId: string; episodeId: string; createdAt: Date }[] = [];
  const progress: { userId: string; episodeId: string; percent: number; updatedAt: Date }[] = [];
  for (const [planIndex, plan] of READS.entries()) {
    if (authorOf(plan.series) === ids[plan.who]) throw new Error(`${plan.who} can't read their own series (${plan.series}).`);
    for (let n = 1; n <= plan.upTo; n += 1) {
      const episode = episodeOf(plan.series, n);
      if (!episode.publishedAt) throw new Error(`${plan.series} ${n} isn't published.`);
      const at = established(
        new Date(Math.min(now - HOUR, episode.publishedAt.getTime() + (((planIndex * 7 + n * 5) % 40) + 2) * HOUR)),
        `${plan.who}'s read of ${plan.series} ${n}`,
      );
      readEvents.push({ userId: ids[plan.who], episodeId: episode.id, createdAt: at });
      progress.push({ userId: ids[plan.who], episodeId: episode.id, percent: n === plan.upTo ? plan.lastPercent : 100, updatedAt: at });
      read.add(`${plan.who}:${plan.series}:${n}`);
    }
  }
  await prisma.readEvent.createMany({ data: readEvents });
  await prisma.readingProgress.createMany({ data: progress });

  const ratings = RATINGS.map((rating) => {
    if (authorOf(rating.series) === ids[rating.who]) throw new Error(`${rating.who} can't rate their own series.`);
    if (!read.has(`${rating.who}:${rating.series}:${rating.episode}`)) throw new Error(`${rating.who} rates ${rating.series} ${rating.episode} without reading it.`);
    if (rating.value < 1 || rating.value > 5) throw new Error("Ratings are 1-5.");
    const episode = episodeOf(rating.series, rating.episode);
    const at = established(new Date(Math.min(now - HOUR, episode.publishedAt!.getTime() + 30 * HOUR)), `${rating.who}'s rating of ${rating.series} ${rating.episode}`);
    return { userId: ids[rating.who], episodeId: episode.id, value: rating.value, createdAt: at, updatedAt: at };
  });
  await prisma.rating.createMany({ data: ratings });

  // Bookmarks and follows are dated at seeding time (as before), which is long
  // after the accounts were created; stated explicitly so the check covers them.
  const seededAt = established(new Date(now), "Bookmarks and follows");
  await prisma.bookmark.createMany({
    data: BOOKMARKS.map((bookmark) => ({ userId: ids[bookmark.who], episodeId: episodeOf(bookmark.series, bookmark.episode).id, createdAt: seededAt })),
  });
  // The SeriesFollow_count trigger keeps Series.followers equal to these rows.
  await prisma.seriesFollow.createMany({
    data: FOLLOWS.map((follow) => ({ userId: ids[follow.who], seriesId: seriesIds[follow.series], createdAt: seededAt })),
  });
  await prisma.authorFollow.createMany({
    data: AUTHOR_FOLLOWS.map((follow) => {
      if (follow.who === follow.writer) throw new Error(`${follow.who} can't follow themselves.`);
      return { followerId: ids[follow.who], authorId: ids[follow.writer], createdAt: seededAt };
    }),
  });
  await prisma.comment.createMany({
    data: COMMENTS.map((comment) => {
      const episode = episodeOf(comment.series, comment.episode);
      return {
        userId: ids[comment.who],
        episodeId: episode.id,
        body: comment.body,
        createdAt: new Date(Math.min(now - HOUR, episode.publishedAt!.getTime() + comment.hoursAfter * HOUR)),
      };
    }),
  });

  /* ------------------------- counts: the same rules as lib/read-tracking.ts */
  // Episode.readerCount = distinct signed-in readers; Series.reads = their sum.
  // Recomputed from every ReadEvent on the test episodes (real members' too),
  // with updatedAt kept so the timeline doesn't jump to "now".
  for (const def of SERIES) {
    const episodes = await prisma.episode.findMany({
      where: { seriesId: seriesIds[def.key] },
      select: { id: true, lastSavedAt: true },
    });
    let seriesReads = 0;
    for (const episode of episodes) {
      const readers = await prisma.readEvent.findMany({ where: { episodeId: episode.id, userId: { not: null } }, distinct: ["userId"], select: { userId: true } });
      seriesReads += readers.length;
      await prisma.episode.update({ where: { id: episode.id }, data: { readerCount: readers.length, updatedAt: episode.lastSavedAt } });
    }
    const series = await prisma.series.findUniqueOrThrow({ where: { id: seriesIds[def.key] }, select: { updatedAt: true } });
    await prisma.series.update({ where: { id: seriesIds[def.key] }, data: { reads: seriesReads, updatedAt: series.updatedAt } });
  }

  /* ------------------------------ Writer A's profile sections (Sweep 14) */
  const writerA = ids.A;
  await prisma.$transaction([
    prisma.profileLibraryItem.deleteMany({ where: { userId: writerA } }),
    prisma.profileAboutCard.deleteMany({ where: { userId: writerA } }),
    prisma.profileLink.deleteMany({ where: { userId: writerA } }),
    prisma.profileLibraryItem.createMany({
      data: [
        ...WRITER_A_PROFILE.books.map((book, position) => ({ userId: writerA, position, kind: "BOOK" as const, title: book.title, note: book.note, url: book.url })),
        ...WRITER_A_PROFILE.seriesInLibrary.map((key, index) => ({
          userId: writerA,
          position: WRITER_A_PROFILE.books.length + index,
          kind: "SERIES" as const,
          seriesId: seriesIds[key],
        })),
      ],
    }),
    prisma.profileAboutCard.createMany({ data: WRITER_A_PROFILE.about.map((card, position) => ({ userId: writerA, position, ...card })) }),
    prisma.profileLink.createMany({ data: WRITER_A_PROFILE.links.map((link, position) => ({ userId: writerA, position, ...link })) }),
  ]);

  /* ------------------------------------------------------------ checks */
  const sample = await prisma.user.findUniqueOrThrow({ where: { email: testEmail(READERS.R1.handle) }, select: { passwordHash: true } });
  if (!sample.passwordHash || !comparePassword(password, sample.passwordHash)) throw new Error("Password check failed.");

  console.log(
    `Activity: ${readEvents.length} reads, ${progress.length} progress rows, ${ratings.length} ratings, ${BOOKMARKS.length} bookmarks, ${FOLLOWS.length} follows, ${AUTHOR_FOLLOWS.length} writer follows, ${COMMENTS.length} comments`,
  );
  console.log("Password check: ok (the shared SEED_TEST_PASSWORD signs in every test account).");
  console.log("Done. Remove everything with npm run seed:test:clear.\n");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(`\nseed:test failed: ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
