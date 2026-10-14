/*
 * Which database the test-catalogue scripts write to. The target must be
 * named on the command line, every time:
 *   --db=main     the main database in .env (the user's decision for Sweep 17)
 *   --db=scratch  the scratch copy in .env.local (refused if it is the main one)
 * DATABASE_URL is set from that file before Prisma is loaded, the host is
 * printed, and connection strings are never printed.
 */
import { describeDatabase, readEnvFile, resolveDevelopmentTarget, sameDatabase } from "../dev-db-target.mjs";

export type Target = { label: "MAIN" | "SCRATCH"; host: string; database: string };

export function resolveTarget(argv: string[]): Target {
  const arg = argv.find((value) => value.startsWith("--db="))?.slice(5);
  if (arg !== "main" && arg !== "scratch") {
    throw new Error("Name the database: --db=main (.env) or --db=scratch (.env.local).");
  }

  let url: string | undefined;
  if (arg === "main") {
    url = readEnvFile(".env")?.DATABASE_URL;
    if (!url) throw new Error(".env has no DATABASE_URL.");
  } else {
    url = resolveDevelopmentTarget().devUrl; // refuses if it is the same database as .env
  }

  const described = describeDatabase(url);
  if (!described) throw new Error("DATABASE_URL is not a valid connection URL.");
  if (arg === "scratch") {
    const main = describeDatabase(readEnvFile(".env")?.DATABASE_URL ?? "");
    if (main && sameDatabase(described, main)) throw new Error("Refusing: the scratch target is the main database.");
  }

  process.env.DATABASE_URL = url;
  return { label: arg === "main" ? "MAIN" : "SCRATCH", host: described.host, database: described.database };
}

/** SEED_TEST_PASSWORD from the environment, .env.local or .env (never printed). */
export function seedPassword() {
  const value = process.env.SEED_TEST_PASSWORD || readEnvFile(".env.local")?.SEED_TEST_PASSWORD || readEnvFile(".env")?.SEED_TEST_PASSWORD;
  if (!value || value.length < 12) {
    throw new Error("Set SEED_TEST_PASSWORD (12+ characters) in .env or .env.local. It is the shared password for every test account.");
  }
  return value;
}

export function announce(target: Target, action: string) {
  console.log(`\n[${action}] Target: ${target.label} database  ${target.host} / ${target.database}\n`);
}
