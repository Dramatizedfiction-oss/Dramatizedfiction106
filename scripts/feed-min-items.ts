/*
 * Sweep D: lowers the feed shelves' minimum size from the old default (4) to
 * the new one (DEFAULT_MIN_ITEMS, 3), so more Explore rows fill while the
 * catalogue is small. Only shelves still at the old default change; a minimum
 * set to anything else in Administration › Feed is kept. Idempotent.
 *
 *   node --import ./tests/setup/register.mjs scripts/feed-min-items.ts --db=main|scratch
 *
 * The feed cache (15 minutes) picks the change up on its next rebuild.
 */
import { announce, resolveTarget } from "./seed-test/target";

const OLD_DEFAULT = 4;

async function main() {
  const target = resolveTarget(process.argv);
  announce(target, "feed-min-items");
  const { prisma } = await import("@/lib/prisma");
  const { DEFAULT_MIN_ITEMS } = await import("@/lib/feed/config");

  const result = await prisma.feedShelf.updateMany({ where: { minItems: OLD_DEFAULT }, data: { minItems: DEFAULT_MIN_ITEMS } });
  console.log(`Shelves changed from ${OLD_DEFAULT} to ${DEFAULT_MIN_ITEMS}: ${result.count}`);
  const rows = await prisma.feedShelf.groupBy({ by: ["minItems"], _count: { _all: true }, orderBy: { minItems: "asc" } });
  console.log("Shelves by minimum:", rows.map((row) => `${row.minItems}: ${row._count._all}`).join(", "), "\n");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
