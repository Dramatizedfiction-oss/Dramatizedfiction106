#!/usr/bin/env node
/*
 * Read-only health check of the DEVELOPMENT database (never production):
 * connection, Postgres version, which app tables exist, row counts, and
 * migration history. Changes nothing.
 *
 *   node scripts/db-dev-check.mjs      (npm run db:dev:check)
 */
import { createRequire } from "node:module";
import { join } from "node:path";
import { TargetError, resolveDevelopmentTarget, root } from "./dev-db-target.mjs";

let target;
try {
  target = resolveDevelopmentTarget();
} catch (error) {
  if (error instanceof TargetError) {
    console.error(`\n[db-dev-check] REFUSED: ${error.message}\n`);
    process.exit(1);
  }
  throw error;
}

const require = createRequire(join(root, "package.json"));
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ datasources: { db: { url: target.devUrl } } });

const APP_TABLES = ["User", "Session", "Series", "Episode", "ReadEvent", "Settings", "CmsArticle"];
const SWEEP_TABLES = ["MemberRestriction", "AdminAuditLog", "PlatformAvatar"];

try {
  console.log(`[db-dev-check] Target: ${target.dev.host} / ${target.dev.database}`);
  const [{ version }] = await prisma.$queryRawUnsafe("SELECT version() AS version");
  console.log(`[db-dev-check] Connected. ${String(version).split(" on ")[0]}`);

  const tables = (await prisma.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  )).map((row) => row.table_name);
  console.log(`[db-dev-check] Tables in public schema: ${tables.length}`);

  for (const name of APP_TABLES) {
    if (!tables.includes(name)) {
      console.log(`  - ${name}: missing`);
      continue;
    }
    const [{ count }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "${name}"`);
    console.log(`  - ${name}: ${count} rows`);
  }
  for (const name of SWEEP_TABLES) {
    console.log(`  - ${name} (Administration migration): ${tables.includes(name) ? "present" : "not yet created"}`);
  }

  if (tables.includes("_prisma_migrations")) {
    const applied = await prisma.$queryRawUnsafe(
      'SELECT migration_name, finished_at IS NOT NULL AS finished FROM "_prisma_migrations" ORDER BY started_at',
    );
    console.log(`[db-dev-check] Migration history: ${applied.length} entr${applied.length === 1 ? "y" : "ies"}`);
    for (const row of applied) console.log(`  - ${row.migration_name}${row.finished ? "" : " (NOT finished)"}`);
  } else {
    console.log("[db-dev-check] Migration history: none (_prisma_migrations table absent)");
  }
  console.log("[db-dev-check] Read-only check complete. Nothing was changed.");
} catch (error) {
  console.error(`[db-dev-check] Connection or query failed: ${error instanceof Error ? error.message.split("\n")[0] : "unknown error"}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
