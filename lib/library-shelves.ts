// Client-safe. The shelves of a member's own Library (Sweep B2), chosen in the
// URL as ?shelf= on their reading profile.

export const LIBRARY_SHELVES = ["following", "bookmarks", "people"] as const;
export type LibraryShelf = (typeof LIBRARY_SHELVES)[number];

export function parseLibraryShelf(value: unknown): LibraryShelf {
  return LIBRARY_SHELVES.includes(value as LibraryShelf) ? (value as LibraryShelf) : "following";
}
