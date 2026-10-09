#!/usr/bin/env node
/*
 * Runs Prisma CLI commands against the DEVELOPMENT database only.
 *
 *   node scripts/db-dev.mjs verify              # print the target, change nothing
 *   node scripts/db-dev.mjs migrate status
 *   node scripts/db-dev.mjs migrate deploy
 *
 * The development DATABASE_URL comes from .env.local (gitignored). Production
 * stays in .env. Prisma's CLI only reads .env, so this script passes the
 * development URL explicitly (Prisma never overrides a variable that is
 * already set). It refuses to run when:
 *   - .env.local or its DATABASE_URL is missing;
 *   - the development URL points at the same host + database as .env
 *     (production);
 *   - the command could drop data (migrate reset, migrate dev, db push,
 *     --force-reset, --accept-data-loss).
 * Credentials are never printed.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { TargetError, resolveDevelopmentTarget, root } from "./dev-db-target.mjs";

function fail(message) {
  console.error(`\n[db-dev] REFUSED: ${message}\n`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) fail("Pass a Prisma command, or `verify`.");

// `migrate dev` can offer to reset the database on drift, so it is blocked too.
const joined = ` ${args.join(" ")} `;
if (/ migrate reset | migrate dev | db push |--force-reset|--accept-data-loss/.test(joined)) {
  fail("Destructive commands (migrate reset, migrate dev, db push, --force-reset, --accept-data-loss) are not allowed here.");
}

let target;
try {
  target = resolveDevelopmentTarget();
} catch (error) {
  if (error instanceof TargetError) fail(error.message);
  throw error;
}

const { devUrl, dev, production } = target;
console.log(`[db-dev] Development target: ${dev.host} / ${dev.database}`);
console.log(`[db-dev] Production (.env, untouched): ${production ? `${production.host} / ${production.database}` : "(not set)"}`);

if (args[0] === "verify") {
  console.log("[db-dev] OK: development and production are different databases. Nothing was run.");
  process.exit(0);
}

const prismaCli = join(root, "node_modules", "prisma", "build", "index.js");
const result = spawnSync(process.execPath, [prismaCli, ...args], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: devUrl },
});
process.exit(result.status ?? 1);
