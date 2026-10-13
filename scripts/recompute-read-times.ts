/*
 * One-time data update (Sweep 13): recompute every episode's stored readTime
 * from its text at the current reading speed (lib/episode-content/text.ts,
 * WORDS_PER_MINUTE). Changes only Episode.readTime, and only where it differs.
 *
 *   node --env-file=.env       --import ./tests/setup/register.mjs scripts/recompute-read-times.ts [--apply]
 *   node --env-file=.env.local --import ./tests/setup/register.mjs scripts/recompute-read-times.ts [--apply]
 *
 * Without --apply it only reports what would change.
 */
import { analyzeEpisodeHtml } from "@/lib/episode-content";
import { prisma } from "@/lib/prisma";

const apply = process.argv.includes("--apply");

async function main() {
  const host = /@([^/:?]+)/.exec(process.env.DATABASE_URL ?? "")?.[1]?.split(".")[0] ?? "unknown";
  console.log(`Database: ${host} (${apply ? "applying" : "dry run"})`);

  const episodes = await prisma.episode.findMany({ select: { id: true, body: true, readTime: true } });
  let changed = 0;
  for (const episode of episodes) {
    const { readTime } = analyzeEpisodeHtml(episode.body);
    if (readTime === episode.readTime) continue;
    changed++;
    if (apply) await prisma.episode.update({ where: { id: episode.id }, data: { readTime } });
  }
  console.log(`${episodes.length} episodes, ${changed} ${apply ? "updated" : "would change"}.`);
}

main().finally(() => prisma.$disconnect());
