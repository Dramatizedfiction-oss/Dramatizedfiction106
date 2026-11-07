#!/usr/bin/env node
/*
 * Phone layout checker (Sweep 4): visits every screen at eight phone and
 * tablet sizes and flags sideways scrolling, elements wider than the screen,
 * small or crowded tap targets, tiny text, covered targets, overlapping
 * fixed bars and clipped text. See docs/PHONE_LAYOUT_REPORT.md.
 *
 *   npm install --no-save playwright-core@1.48.2   # once; drives the installed Edge/Chrome
 *   npm run build && npm run start                  # or npm run dev (uses .env.local)
 *   npm run test:phone                              # all screens, all sizes
 *   npm run test:phone -- --screens                 # plus WebP screenshots, dark and light
 *   npm run test:phone -- --sizes=smoke --only=series
 *
 * Refuses unless .env.local points at a database other than .env's. It makes
 * its own tagged accounts and stories (@phone-check.invalid) and removes them.
 */
import { spawnSync } from "node:child_process";
import { TargetError, resolveDevelopmentTarget, root } from "./dev-db-target.mjs";

let target;
try {
  target = resolveDevelopmentTarget();
} catch (error) {
  if (error instanceof TargetError) {
    console.error(`\n[test-phone] REFUSED: ${error.message}\n`);
    process.exit(1);
  }
  throw error;
}

console.log(`[test-phone] Development database: ${target.dev.host} / ${target.dev.database}`);
const result = spawnSync(
  process.execPath,
  ["--import", "./tests/setup/register.mjs", "tests/phone/run.ts", ...process.argv.slice(2)],
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
