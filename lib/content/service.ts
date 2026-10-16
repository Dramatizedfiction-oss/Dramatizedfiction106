import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { AUDIT, recordAudit } from "@/lib/admin/audit";
import { contentTag } from "@/lib/content/read";
import { CONTENT_DEFS, getContentDef, validateContent, type ContentValues } from "@/lib/content/registry";
import { prisma } from "@/lib/prisma";

/*
 * Saving Administration › Content (Sweep B3). Board and CEO only (the routes
 * check). Every save writes the new version to ContentItem and a copy to
 * ContentRevision, and an AdminAuditLog row with the key and version (never
 * the text). Saves carry the version the editor started from; if someone
 * else saved in between, the save is refused (409) instead of overwriting.
 * Restoring an old version saves it again as a new version.
 */

export type ContentMeta = {
  key: string;
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type ContentState = ContentMeta & { values: ContentValues; source: "saved" | "built-in"; storedInvalid: boolean };

type Failure = { ok: false; status: number; code: string; message: string; field?: string };
const fail = (status: number, code: string, message: string, field?: string): Failure => ({ ok: false, status, code, message, field });

/** The editor's starting point: the stored values (or built-in text) and who saved them last. */
export async function getContentState(key: string): Promise<ContentState | null> {
  const def = getContentDef(key);
  if (!def) return null;
  const row = await prisma.contentItem.findUnique({
    where: { key },
    select: { data: true, version: true, updatedAt: true, updatedBy: { select: { name: true } } },
  });
  if (!row) return { key, version: 0, updatedAt: null, updatedBy: null, values: def.defaults, source: "built-in", storedInvalid: false };
  const check = validateContent(def, row.data);
  return {
    key,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy?.name ?? null,
    // An invalid stored version opens with the built-in text (what the site shows).
    values: check.ok ? check.values : def.defaults,
    source: check.ok ? "saved" : "built-in",
    storedInvalid: !check.ok,
  };
}

/** Every item's last-edited line, for the Content home page. */
export async function listContentMeta() {
  const rows = await prisma.contentItem.findMany({
    select: { key: true, version: true, updatedAt: true, updatedBy: { select: { name: true } } },
  });
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return CONTENT_DEFS.map((def): ContentMeta => {
    const row = byKey.get(def.key);
    return {
      key: def.key,
      version: row?.version ?? 0,
      updatedAt: row?.updatedAt.toISOString() ?? null,
      updatedBy: row?.updatedBy?.name ?? null,
    };
  });
}

async function writeVersion(
  actorId: string,
  key: string,
  baseVersion: number,
  values: ContentValues,
  action: "SAVE" | "RESTORE" | "SEED",
  restoredFrom?: number,
): Promise<{ ok: true; state: ContentState } | Failure> {
  const data = values as Prisma.InputJsonObject;
  try {
    const version = await prisma.$transaction(async (tx) => {
      let next: number;
      if (baseVersion === 0) {
        // First save: fails with a unique violation if someone else created it meanwhile.
        await tx.contentItem.create({ data: { key, data, version: 1, updatedById: actorId } });
        next = 1;
      } else {
        const updated = await tx.contentItem.updateMany({
          where: { key, version: baseVersion },
          data: { data, version: { increment: 1 }, updatedById: actorId },
        });
        if (updated.count === 0) return null;
        next = baseVersion + 1;
      }
      await tx.contentRevision.create({ data: { key, version: next, data, action, createdById: actorId } });
      if (action !== "SEED") {
        await recordAudit(tx, {
          action: action === "RESTORE" ? AUDIT.CONTENT_RESTORED : AUDIT.CONTENT_SAVED,
          actorId,
          details: { key, version: next, ...(restoredFrom ? { restoredFrom } : {}) },
        });
      }
      return next;
    });
    if (version === null) return conflict();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return conflict();
    throw error;
  }
  revalidateTag(contentTag(key));
  return { ok: true, state: (await getContentState(key))! };
}

const conflict = () =>
  fail(409, "CONFLICT", "Someone else saved this item while you were editing. Copy your changes, reload, and try again.");

export async function saveContent(actorId: string, key: string, baseVersion: unknown, data: unknown) {
  const def = getContentDef(key);
  if (!def) return fail(404, "NOT_FOUND", "Content item not found.");
  if (typeof baseVersion !== "number" || !Number.isInteger(baseVersion) || baseVersion < 0) {
    return fail(400, "BAD_REQUEST", "Reload the page and try again.");
  }
  const check = validateContent(def, data);
  if (!check.ok) return fail(400, "INVALID", check.message, check.field);
  return writeVersion(actorId, key, baseVersion, check.values, "SAVE");
}

export async function restoreContent(actorId: string, key: string, version: unknown, baseVersion: unknown) {
  const def = getContentDef(key);
  if (!def) return fail(404, "NOT_FOUND", "Content item not found.");
  if (typeof version !== "number" || typeof baseVersion !== "number" || !Number.isInteger(baseVersion)) {
    return fail(400, "BAD_REQUEST", "Reload the page and try again.");
  }
  // Version 0 is the built-in text.
  let data: unknown = def.defaults;
  if (version !== 0) {
    const revision = await prisma.contentRevision.findUnique({ where: { key_version: { key, version } }, select: { data: true } });
    if (!revision) return fail(404, "NOT_FOUND", "That version wasn't found.");
    data = revision.data;
  }
  const check = validateContent(def, data);
  if (!check.ok) return fail(400, "INVALID", `That version can't be restored: ${check.message}`);
  return writeVersion(actorId, key, baseVersion, check.values, "RESTORE", version);
}

export type RevisionEntry = { version: number; action: string; createdAt: string; createdBy: string | null; values: ContentValues | null };

/** Saved versions, newest first (at most 50), each with its text for viewing. */
export async function listRevisions(key: string): Promise<RevisionEntry[] | null> {
  const def = getContentDef(key);
  if (!def) return null;
  const rows = await prisma.contentRevision.findMany({
    where: { key },
    orderBy: { version: "desc" },
    take: 50,
    select: { version: true, action: true, createdAt: true, data: true, createdBy: { select: { name: true } } },
  });
  return rows.map((row) => {
    const check = validateContent(def, row.data);
    return {
      version: row.version,
      action: row.action,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy?.name ?? null,
      values: check.ok ? check.values : null,
    };
  });
}

/** Seeds version 1 of an item that has never been saved (scripts/seed-content.ts). Saved items are left alone. */
export async function seedContent(actorId: string | null, key: string, values: ContentValues) {
  const def = getContentDef(key);
  if (!def) throw new Error(`Unknown content item "${key}".`);
  const check = validateContent(def, values);
  if (!check.ok) throw new Error(`${key}: ${check.message}`);
  const data = check.values as Prisma.InputJsonObject;
  return prisma.$transaction(async (tx) => {
    const existing = await tx.contentItem.findUnique({ where: { key }, select: { version: true } });
    if (existing) return false;
    await tx.contentItem.create({ data: { key, data, version: 1, updatedById: actorId } });
    await tx.contentRevision.create({ data: { key, version: 1, data, action: "SEED", createdById: actorId } });
    return true;
  });
}
