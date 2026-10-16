/*
 * Sweep 17: removes the test catalogue and everything attached to it.
 *
 *   npm run seed:test:clear            -> main database (.env)
 *   npm run seed:test:clear:scratch    -> scratch copy (.env.local)
 *
 * The only marker is the test accounts' email domain (@test.dramatizedfiction.invalid).
 * In one transaction:
 *   1. RevenueEvent rows naming a test user, series or episode (no foreign keys).
 *   2. AiTagReport rows on test series; ContentReport rows on test users' comments
 *      (removed first, as account deletion does, so no report row is both
 *      cascade-deleted and set-null in the same statement).
 *   3. ReadEvent and AdImpression rows made by test users (their user link is
 *      set-null on delete, so they would otherwise be left behind anonymised).
 *   4. The test users' personal studios (owner link is set-null on delete).
 *   5. The test users. Cascades: sessions, author profiles, series, episodes,
 *      ratings, bookmarks, comments, follows, reading progress, profile
 *      Library/About/Links rows, and anything real members attached to test
 *      series or episodes (their follows, ratings, bookmarks, comments, reads).
 * Then it checks that nothing is left. The cover files in public/test-covers/
 * are part of the code, not the data, and stay.
 */
import { TEST_EMAIL_DOMAIN } from "./seed-test/catalogue";
import { announce, resolveTarget } from "./seed-test/target";

async function main() {
  const target = resolveTarget(process.argv);
  announce(target, "seed:test:clear");
  const { prisma } = await import("@/lib/prisma");
  const marker = { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } };

  const users = await prisma.user.findMany({ where: marker, select: { id: true } });
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) {
    console.log("No test data found. Nothing to remove.\n");
    await prisma.$disconnect();
    return;
  }
  const series = await prisma.series.findMany({ where: { authorId: { in: userIds } }, select: { id: true } });
  const seriesIds = series.map((row) => row.id);
  const episodes = await prisma.episode.findMany({
    where: { OR: [{ authorId: { in: userIds } }, { seriesId: { in: seriesIds } }] },
    select: { id: true },
  });
  const episodeIds = episodes.map((row) => row.id);

  const counts = await prisma.$transaction(
    async (tx) => {
      const revenue = await tx.revenueEvent.deleteMany({
        where: { OR: [{ userId: { in: userIds } }, { seriesId: { in: seriesIds } }, { episodeId: { in: episodeIds } }] },
      });
      const aiReports = await tx.aiTagReport.deleteMany({ where: { seriesId: { in: seriesIds } } });
      const commentReports = await tx.contentReport.deleteMany({ where: { comment: { userId: { in: userIds } } } });
      const reads = await tx.readEvent.deleteMany({ where: { userId: { in: userIds } } });
      const impressions = await tx.adImpression.deleteMany({ where: { userId: { in: userIds } } });
      const studios = await tx.studio.deleteMany({ where: { ownerId: { in: userIds }, kind: "PERSONAL" } });
      const deleted = await tx.user.deleteMany({ where: { id: { in: userIds } } });
      return { revenue, aiReports, commentReports, reads, impressions, studios, deleted };
    },
    { maxWait: 15_000, timeout: 60_000 },
  );

  console.log(`Removed ${counts.deleted.count} test accounts with ${seriesIds.length} series and ${episodeIds.length} episodes (and everything attached).`);
  console.log(
    `Also removed: ${counts.reads.count} reads, ${counts.revenue.count} revenue rows, ${counts.aiReports.count + counts.commentReports.count} reports, ${counts.impressions.count} ad impressions, ${counts.studios.count} personal studios.`,
  );

  // Nothing may be left behind.
  const left = await Promise.all([
    prisma.user.count({ where: marker }),
    prisma.series.count({ where: { id: { in: seriesIds } } }),
    prisma.episode.count({ where: { id: { in: episodeIds } } }),
    prisma.rating.count({ where: { OR: [{ userId: { in: userIds } }, { episodeId: { in: episodeIds } }] } }),
    prisma.bookmark.count({ where: { OR: [{ userId: { in: userIds } }, { episodeId: { in: episodeIds } }] } }),
    prisma.comment.count({ where: { OR: [{ userId: { in: userIds } }, { episodeId: { in: episodeIds } }] } }),
    prisma.seriesFollow.count({ where: { OR: [{ userId: { in: userIds } }, { seriesId: { in: seriesIds } }] } }),
    prisma.authorFollow.count({ where: { OR: [{ followerId: { in: userIds } }, { authorId: { in: userIds } }] } }),
    prisma.rateLimitHit.count({ where: { userId: { in: userIds } } }),
    prisma.readEvent.count({ where: { OR: [{ userId: { in: userIds } }, { episodeId: { in: episodeIds } }] } }),
    prisma.readingProgress.count({ where: { userId: { in: userIds } } }),
    prisma.session.count({ where: { userId: { in: userIds } } }),
    prisma.studio.count({ where: { ownerId: { in: userIds } } }),
  ]);
  const remaining = left.reduce((sum, value) => sum + value, 0);
  if (remaining > 0) throw new Error(`${remaining} test rows are still present: ${left.join(", ")}`);
  console.log("Check: no test rows remain.\n");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(`\nseed:test:clear failed: ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
