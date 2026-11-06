// Client-safe rules for the Store (Sweep B3). Pure: no database.
//
// Everything is free to choose today. StoreItem.priceCents exists for later
// and is never shown or charged; a member's chosen avatar is User.image, so
// there are no ownership rows. Writer-level frames are earned, not Store items;
// since Sweep I a member may wear a Store frame instead (User.selectedFrameId)
// or none, chosen on the Store's Frames tab.

// Each category is managed in Administration › Back of the store at
// BACK_OF_STORE_PATH/<adminSlug> (Sweep D); a new item type adds an entry here
// and its own page there.
export const STORE_CATEGORIES = [
  {
    id: "AVATAR",
    label: "Avatars",
    description: "Pictures for your profile. Choose one and it's yours right away.",
    empty: "No avatars yet. Check back soon.",
    adminSlug: "avatars",
    adminDescription: "Add, rename, hide, reorder and remove avatars, and set the Reader and Writer defaults.",
  },
  {
    id: "FRAME",
    label: "Frames",
    description: "A frame around your avatar. Choose one and it shows everywhere your picture does.",
    empty: "No frames yet. Check back soon.",
    adminSlug: "frames",
    adminDescription: "Upload frames (PNG, WebP or SVG), preview them on an avatar, rename, hide, reorder and remove them.",
  },
] as const;

// ---- Frames (Sweep I) -----------------------------------------------------------

/** Stored frame images are square WebP files this size. */
export const FRAME_IMAGE_SIZE = 512;
/** Raster uploads smaller than this on a side are refused (blurry on profiles). */
export const FRAME_MIN_SOURCE_SIDE = 256;
/** How far from square an upload may be (2%). */
export const FRAME_SQUARE_TOLERANCE = 0.02;
export const FRAME_UPLOAD_MAX_BYTES = 1024 * 1024;

/**
 * What a member picks on the Store's Frames tab: their level frame ("level",
 * writers; for readers it's the same as none), no frame at all, or a Store frame by id.
 */
export type FrameChoice = { kind: "level" } | { kind: "none" } | { kind: "store"; itemId: string };

export function parseFrameChoice(value: unknown): FrameChoice | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (input.choice === "level") return { kind: "level" };
  if (input.choice === "none") return { kind: "none" };
  if (input.choice === "store" && typeof input.itemId === "string" && input.itemId.length > 0 && input.itemId.length <= 191) {
    return { kind: "store", itemId: input.itemId };
  }
  return null;
}

export const BACK_OF_STORE_PATH = "/administration/back-of-store";

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
