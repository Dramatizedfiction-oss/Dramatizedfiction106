#!/usr/bin/env node
/*
 * Runs tests/integration/* against the DEVELOPMENT database only (and, for the
 * HTTP tests, a dev server started with the same .env.local).
 *
 *   node scripts/test-integration.mjs
 *
 * Refuses unless .env.local points at a database other than .env's
 * (production). Test data is created with unique names and removed afterwards.
 */
import { spawnSync } from "node:child_process";
import { TargetError, resolveDevelopmentTarget, root } from "./dev-db-target.mjs";

let target;
try {
  target = resolveDevelopmentTarget();
} catch (error) {
  if (error instanceof TargetError) {
    console.error(`\n[test-integration] REFUSED: ${error.message}\n`);
    process.exit(1);
  }
  throw error;
}

console.log(`[test-integration] Development database: ${target.dev.host} / ${target.dev.database}`);
const result = spawnSync(
  process.execPath,
  ["--test", "--test-concurrency=1", "--import", "./tests/setup/register.mjs", "tests/integration/*.test.ts"],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: target.devUrl,
      CEO_PASSWORD: target.local.CEO_PASSWORD ?? "",
      DF_INTEGRATION: "1",
      DF_TEST_BASE_URL: process.env.DF_TEST_BASE_URL ?? "http://localhost:3000",
    },
  },
);
process.exit(result.status ?? 1);
