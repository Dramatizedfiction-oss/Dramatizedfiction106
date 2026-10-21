// Client-safe. The sections of a member's own Library (Sweep B2; one scrolling
// page since Sweep D): Followed Series, Bookmarks, Follows. ?shelf= on their
// reading profile scrolls to one. The keys are the URL values Sweep B2 used.

export const LIBRARY_SHELVES = ["following", "bookmarks", "people"] as const;
export type LibraryShelf = (typeof LIBRARY_SHELVES)[number];

export const LIBRARY_SHELF_TITLES: Record<LibraryShelf, string> = {
  following: "Followed Series",
  bookmarks: "Bookmarks",
  people: "Follows",
};

/** Element id of each section (the ?shelf= scroll target). */
export const LIBRARY_SHELF_IDS: Record<LibraryShelf, string> = {
  following: "library-followed-series",
  bookmarks: "library-bookmarks",
  people: "library-follows",
};

/** The new names work in the URL too. */
const ALIASES: Record<string, LibraryShelf> = { "followed-series": "following", follows: "people" };

export function parseLibraryShelf(value: unknown): LibraryShelf {
  if (typeof value === "string" && value in ALIASES) return ALIASES[value];
  return LIBRARY_SHELVES.includes(value as LibraryShelf) ? (value as LibraryShelf) : "following";
}
