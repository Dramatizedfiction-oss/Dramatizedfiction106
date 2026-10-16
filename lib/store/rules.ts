// Client-safe rules for the Store (Sweep B3). Pure: no database.
//
// Everything is free to choose today. StoreItem.priceCents exists for later
// and is never shown or charged; a member's chosen avatar is User.image, so
// there are no ownership rows. Writer frames are earned by level and are not
// Store items.

export const STORE_CATEGORIES = [
  {
    id: "AVATAR",
    label: "Avatars",
    description: "Pictures for your profile. Choose one and it's yours right away.",
    empty: "No avatars yet. Check back soon.",
  },
] as const;

export type StoreCategory = (typeof STORE_CATEGORIES)[number]["id"];

export function isStoreCategory(value: unknown): value is StoreCategory {
  return STORE_CATEGORIES.some((category) => category.id === value);
}

export function parseStoreCategory(value: unknown): StoreCategory {
  return isStoreCategory(value) ? value : "AVATAR";
}

export const STORE_ITEM_NAME_MAX = 80;

export function cleanItemName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.replace(/\s+/g, " ").trim().slice(0, STORE_ITEM_NAME_MAX);
  return name || null;
}

/**
 * A reorder request is valid only when it lists exactly the category's items,
 * each once (so nothing can be dropped, duplicated or pulled in from elsewhere).
 */
export function checkReorder(requested: unknown, existing: string[]): string[] | null {
  if (!Array.isArray(requested) || requested.length !== existing.length) return null;
  const ids = requested.filter((id): id is string => typeof id === "string");
  if (new Set(ids).size !== existing.length) return null;
  const known = new Set(existing);
  return ids.every((id) => known.has(id)) ? ids : null;
}
