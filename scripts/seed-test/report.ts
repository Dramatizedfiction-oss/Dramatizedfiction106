/*
 * Read-only summary of the test catalogue: row counts, words per episode and
 * each series' pooled rating. Used to check that seeding twice changes nothing.
 *   node --import ./tests/setup/register.mjs scripts/seed-test/report.ts --db=main|scratch
 */
import { analyzeEpisodeHtml } from "@/lib/episode-content";
import { TEST_EMAIL_DOMAIN } from "./catalogue";
import { announce, resolveTarget } from "./target";

async function main() {
  const target = resolveTarget(process.argv);
  announce(target, "seed:test report");
  const { prisma } = await import("@/lib/prisma");
  const users = await prisma.user.findMany({ where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } }, select: { id: true } });
  const userIds = users.map((user) => user.id);
  const series = await prisma.series.findMany({
    where: { authorId: { in: userIds } },
    orderBy: { title: "asc" },
    select: { id: true, title: true, status: true, reads: true, followers: true, episodes: { select: { body: true, status: true } } },
  });
  const words = series.flatMap((row) => row.episodes.map((episode) => analyzeEpisodeHtml(episode.body).wordCount));
  const counts = {
    users: users.length,
    series: series.length,
    episodes: words.length,
    ratings: await prisma.rating.count({ where: { userId: { in: userIds } } }),
    bookmarks: await prisma.bookmark.count({ where: { userId: { in: userIds } } }),
    comments: await prisma.comment.count({ where: { userId: { in: userIds } } }),
    follows: await prisma.seriesFollow.count({ where: { userId: { in: userIds } } }),
    reads: await prisma.readEvent.count({ where: { userId: { in: userIds } } }),
    progress: await prisma.readingProgress.count({ where: { userId: { in: userIds } } }),
  };
  console.log(JSON.stringify(counts));
  if (words.length) console.log(`Words per episode: min ${Math.min(...words)}, max ${Math.max(...words)}, total ${words.reduce((a, b) => a + b, 0)}`);
  for (const row of series) {
    const rating = await prisma.rating.aggregate({
      where: { episode: { seriesId: row.id, status: "PUBLISHED" } },
      _avg: { value: true },
      _count: true,
    });
    const avg = rating._avg.value === null ? "-" : rating._avg.value.toFixed(1);
    console.log(`${row.title.padEnd(36)} ${row.status.padEnd(9)} eps ${String(row.episodes.length).padStart(2)}  reads ${String(row.reads).padStart(3)}  followers ${row.followers}  rating ${avg} (${rating._count})`);
  }
  await prisma.$disconnect();
}

void main();
