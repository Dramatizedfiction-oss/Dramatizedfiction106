/*
 * Resolves the DEVELOPMENT database from .env.local and proves it is not the
 * production database in .env. Shared by scripts/db-dev.mjs and the
 * integration test runner. Never prints credentials.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function readEnvFile(name) {
  const path = join(root, name);
  if (!existsSync(path)) return null;
  const values = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

export function describeDatabase(url) {
  try {
    const parsed = new URL(url);
    return { host: parsed.hostname.toLowerCase(), database: parsed.pathname.replace(/^\//, "") || "(default)" };
  } catch {
    return null;
  }
}

/** Neon pooled and direct hosts differ only by "-pooler"; treat them as the same database. */
export function sameDatabase(a, b) {
  const host = (value) => value.host.replace("-pooler.", ".");
  return host(a) === host(b) && a.database === b.database;
}

export class TargetError extends Error {}

/** Throws TargetError unless .env.local names a database different from .env's. */
export function resolveDevelopmentTarget() {
  const local = readEnvFile(".env.local");
  if (!local) throw new TargetError("No .env.local file. Create it with DATABASE_URL for the development database.");
  const devUrl = local.DATABASE_URL;
  if (!devUrl) throw new TargetError(".env.local has no DATABASE_URL.");
  const dev = describeDatabase(devUrl);
  if (!dev) throw new TargetError("DATABASE_URL in .env.local is not a valid connection URL.");

  const productionUrl = readEnvFile(".env")?.DATABASE_URL;
  const production = productionUrl ? describeDatabase(productionUrl) : null;
  if (production && sameDatabase(dev, production)) {
    throw new TargetError(
      `.env.local points at the same database as .env (${production.host}/${production.database}). Use the development database.`,
    );
  }
  return { devUrl, dev, production, local };
}
