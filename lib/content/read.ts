import { unstable_cache } from "next/cache";
import { getContentDef, validateContent, type ContentValues } from "@/lib/content/registry";
import { prisma } from "@/lib/prisma";

/*
 * How the live site reads Administration › Content (Sweep B3). getContent(key)
 * returns the saved values when they're valid, and the built-in defaults
 * (today's text, lib/content/registry.ts) when the item has never been saved,
 * fails validation, or the database can't be read. It never throws, so
 * Content can't break a page.
 *
 * Reads are cached across requests and cleared by tag when an item is saved
 * (lib/content/service.ts), so pages don't add a query per item per visit.
 */

export const contentTag = (key: string) => `content:${key}`;

const readStored = (key: string) =>
  unstable_cache(
    async () => {
      const row = await prisma.contentItem.findUnique({ where: { key }, select: { data: true, updatedAt: true } });
      return row ? { data: row.data as unknown, updatedAt: row.updatedAt.toISOString() } : null;
    },
    ["content", key],
    { tags: [contentTag(key)] },
  )();

export type ContentRead<T extends ContentValues = ContentValues> = {
  values: T;
  source: "saved" | "built-in";
  /** When the shown version was saved (null for the built-in text). */
  updatedAt: string | null;
};

export async function getContent<T extends ContentValues = ContentValues>(key: string): Promise<ContentRead<T>> {
  const def = getContentDef(key);
  if (!def) throw new Error(`Unknown content item "${key}".`);
  try {
    const stored = await readStored(key);
    if (stored !== null) {
      const check = validateContent(def, stored.data);
      if (check.ok) return { values: check.values as T, source: "saved", updatedAt: stored.updatedAt };
      console.warn(`Content "${key}" is invalid (${check.message}); showing the built-in text.`);
    }
  } catch (error) {
    console.error(`Content "${key}" couldn't be read; showing the built-in text.`, error);
  }
  return { values: def.defaults as T, source: "built-in", updatedAt: null };
}

/** Several items at once (each falls back on its own). */
export async function getContents(keys: string[]) {
  const reads = await Promise.all(keys.map((key) => getContent(key)));
  return Object.fromEntries(keys.map((key, index) => [key, reads[index].values]));
}
