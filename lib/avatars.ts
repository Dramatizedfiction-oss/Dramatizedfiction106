import { hasRoleAccess } from "@/lib/roles";

/*
 * Profile pictures. Client-safe.
 *
 * User.image holds only a picture the user uploaded (or legacy custom URL);
 * null means "no custom picture". Defaults are chosen at display time and are
 * never written to the database, so:
 *   - an uploaded picture always wins over a default;
 *   - a role change only changes which default is shown, never a custom picture;
 *   - removing a custom picture falls back to the right default automatically;
 *   - changing a default in Administration never touches anyone's own picture.
 *
 * DEFAULT_AVATARS point at /api/avatars/default/*, which redirects to the
 * default chosen in Administration > Avatars, or to the built-in file below.
 */
export const BUILT_IN_AVATARS = {
  reader: "/avatars/reader-default.svg",
  writer: "/avatars/writer-default.svg",
} as const;

export const DEFAULT_AVATARS = {
  reader: "/api/avatars/default/reader",
  writer: "/api/avatars/default/writer",
} as const;

export type AvatarUser = {
  image?: string | null;
  role?: string | null;
};

/** WRITER, BOARD and CEO get the writer default; everyone else the reader default. */
export function defaultAvatarFor(role: string | null | undefined) {
  return hasRoleAccess(role, "WRITER") ? DEFAULT_AVATARS.writer : DEFAULT_AVATARS.reader;
}

export function hasCustomAvatar(user: AvatarUser) {
  return Boolean(user.image?.trim());
}

/** The picture to show: the custom one if set, otherwise the role default. */
export function avatarSrc(user: AvatarUser) {
  return hasCustomAvatar(user) ? user.image!.trim() : defaultAvatarFor(user.role);
}
