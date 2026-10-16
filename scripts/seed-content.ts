/*
 * Sweep B3: records today's text as version 1 of every Administration ›
 * Content item that has never been saved, so its history starts from the
 * text the site already shows. Safe to run again: saved items are left alone.
 * The writer onboarding article comes from the old CmsArticle row when one
 * exists (it may have been edited), otherwise from the built-in text.
 *
 *   npm run seed:content            -> main database (.env)
 *   npm run seed:content:scratch    -> scratch copy (.env.local)
 *
 * Changes nothing the site shows: the seeded values equal what it already
 * falls back to.
 */
import { announce, resolveTarget } from "./seed-test/target";

async function main() {
  const target = resolveTarget(process.argv);
  announce(target, "seed:content");
  const { prisma } = await import("@/lib/prisma");
  const { CONTENT_DEFS } = await import("@/lib/content/registry");
  const { seedContent } = await import("@/lib/content/service");

  let created = 0;
  for (const def of CONTENT_DEFS) {
    let values = def.defaults;
    if (def.key === "article.writer-onboarding") {
      const old = await prisma.cmsArticle.findUnique({ where: { slug: "writer-onboarding" } });
      if (old) values = { title: old.title, quick: old.quickSectionContent, deep: old.deepSectionContent };
    }
    const added = await seedContent(null, def.key, values);
    console.log(`${added ? "seeded " : "kept   "} ${def.key}`);
    if (added) created += 1;
  }
  console.log(`\n${created} item(s) seeded, ${CONTENT_DEFS.length - created} already had a saved version.\n`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(`\nseed:content failed: ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
