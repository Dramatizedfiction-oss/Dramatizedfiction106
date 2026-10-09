import { avatarSrc, type AvatarUser } from "@/lib/avatars";

/*
 * The one way to show a person's profile picture: always circular, custom
 * picture first, role default otherwise (lib/avatars.ts). Only for people;
 * series/episode covers, banners and other content images stay as they are.
 */
const SIZES = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
  xl: "h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32",
} as const;

export type UserAvatarSize = keyof typeof SIZES;

export default function UserAvatar({
  user,
  size = "sm",
  label,
  className = "",
}: {
  user: AvatarUser;
  size?: UserAvatarSize;
  /** Accessible name when the picture stands alone; omit when a name is shown next to it. */
  label?: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarSrc(user)}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      loading="lazy"
      decoding="async"
      className={`${SIZES[size]} shrink-0 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] object-cover ${className}`.trim()}
    />
  );
}
