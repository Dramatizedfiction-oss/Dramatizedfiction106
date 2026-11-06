#!/usr/bin/env node
/*
 * Smoke tests (Sweep 3): the main journeys for every role, over HTTP,
 * against a running dev server and the DEVELOPMENT database only.
 *
 *   npm run dev            # in one terminal (uses .env.local)
 *   npm run test:smoke     # in another
 *
 * Refuses unless .env.local points at a database other than .env's. Every
 * account and story it makes is tagged and removed afterwards, so it also
 * runs on a fresh, empty database. DF_TEST_BASE_URL overrides the address.
 */
import { spawnSync } from "node:child_process";
import { TargetError, resolveDevelopmentTarget, root } from "./dev-db-target.mjs";

let target;
try {
  target = resolveDevelopmentTarget();
} catch (error) {
  if (error instanceof TargetError) {
    console.error(`\n[test-smoke] REFUSED: ${error.message}\n`);
    process.exit(1);
  }
  throw error;
}

console.log(`[test-smoke] Development database: ${target.dev.host} / ${target.dev.database}`);
const result = spawnSync(
  process.execPath,
  ["--test", "--test-concurrency=1", "--import", "./tests/setup/register.mjs", "tests/smoke/*.test.ts"],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: target.devUrl,
      DF_SMOKE: "1",
      DF_TEST_BASE_URL: process.env.DF_TEST_BASE_URL ?? "http://localhost:3000",
    },
  },
);
process.exit(result.status ?? 1);
