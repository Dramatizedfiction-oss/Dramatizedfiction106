import { AUDIT, recordAudit } from "@/lib/admin/audit";
import { removePlatformAvatar } from "@/lib/admin/avatars-service";
import { prisma } from "@/lib/prisma";
import { checkReorder, cleanItemName, isStoreCategory, type StoreCategory } from "@/lib/store/rules";

/*
 * The Store (Sweep B3). Members browse active items; Board and CEO manage
 * them in Administration › Store (the routes check the role). Adding an
 * avatar goes through lib/admin/avatars-service.addPlatformAvatar (it creates
 * the library avatar and its Store item together). Every change is audited.
 * Nothing here has a price, checkout or ownership: see lib/store/rules.ts.
 */

export type StoreItemView = { id: string; category: string; name: string; imageUrl: string; active: boolean; sortOrder: number };

const itemSelect = { id: true, category: true, name: true, imageUrl: true, active: true, sortOrder: true } as const;

/** Items in one category, in Store order. Members only ever get active ones. */
export function listStoreItems(category: StoreCategory, { includeHidden = false } = {}): Promise<StoreItemView[]> {
  return prisma.storeItem.findMany({
    where: { category, ...(includeHidden ? {} : { active: true }) },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: itemSelect,
  });
}

type Failure = { ok: false; status: number; message: string };
const fail = (status: number, message: string): Failure => ({ ok: false, status, message });

/** Rename and/or hide/show an item. Hiding never takes it away from members already using it. */
export async function updateStoreItem(actorId: string, id: string, input: { name?: unknown; active?: unknown }) {
  const item = await prisma.storeItem.findUnique({ where: { id }, select: { id: true, platformAvatarId: true } });
  if (!item) return fail(404, "That item wasn't found.");
  const data: { name?: string; active?: boolean } = {};
  if (input.name !== undefined) {
    const name = cleanItemName(input.name);
    if (!name) return fail(400, "Give the item a name.");
    data.name = name;
  }
  if (input.active !== undefined) {
    if (typeof input.active !== "boolean") return fail(400, "Choose shown or hidden.");
    data.active = input.active;
  }
  if (!Object.keys(data).length) return fail(400, "Nothing to change.");

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.storeItem.update({ where: { id }, data, select: itemSelect });
    // The library avatar keeps the same name (Administration lists and defaults use it).
    if (data.name && item.platformAvatarId) await tx.platformAvatar.update({ where: { id: item.platformAvatarId }, data: { label: data.name } });
    await recordAudit(tx, { action: AUDIT.STORE_ITEM_UPDATED, actorId, details: { storeItemId: id, ...data } });
    return row;
  });
  return { ok: true as const, item: updated };
}

/** Sets the order of a whole category: `ids` must list exactly its items. */
export async function reorderStoreItems(actorId: string, category: unknown, ids: unknown) {
  if (!isStoreCategory(category)) return fail(400, "Unknown category.");
  const existing = await prisma.storeItem.findMany({ where: { category }, select: { id: true } });
  const order = checkReorder(ids, existing.map((item) => item.id));
  if (!order) return fail(409, "The Store changed while you were reordering. Reload and try again.");
  await prisma.$transaction([
    ...order.map((id, index) => prisma.storeItem.update({ where: { id }, data: { sortOrder: index } })),
    prisma.adminAuditLog.create({ data: { action: AUDIT.STORE_ITEM_REORDERED, actorId, details: { category, count: order.length } } }),
  ]);
  return { ok: true as const };
}

/**
 * Deletes an item. For an avatar this removes the library avatar too: members
 * using it, and a default set to it, fall back to the role default.
 */
export async function removeStoreItem(actorId: string, id: string) {
  const item = await prisma.storeItem.findUnique({ where: { id }, select: { id: true, platformAvatarId: true } });
  if (!item) return fail(404, "That item wasn't found.");
  if (item.platformAvatarId) {
    const result = await removePlatformAvatar(actorId, item.platformAvatarId);
    if (!result.ok) return fail(result.status, result.message);
  } else {
    await prisma.storeItem.delete({ where: { id } });
  }
  await recordAudit(prisma, { action: AUDIT.STORE_ITEM_REMOVED, actorId, details: { storeItemId: id } });
  return { ok: true as const };
}
