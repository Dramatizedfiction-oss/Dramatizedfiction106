"use client";

import { useEffect, useRef, useState } from "react";
import { BUILT_IN_AVATARS, avatarSrc, defaultAvatarFor, type AvatarUser } from "@/lib/avatars";
import { hasRoleAccess } from "@/lib/roles";

/*
 * The one way to show a person's profile picture: always circular, custom
 * picture first, role default otherwise (lib/avatars.ts). If the picture
 * can't load, it falls back to the default, then to the built-in file, so a
 * broken-image icon never shows. Only for people; series/episode covers,
 * banners and other content images stay as they are. Writer frames wrap this
 * (components/avatar/FramedAvatar.tsx).
 */
export const AVATAR_SIZES = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
  xl: "h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32",
  /** Profile headers: 112px on phones up to 160px on desktop. */
  "2xl": "h-28 w-28 sm:h-32 sm:w-32 md:h-40 md:w-40",
} as const;

export type UserAvatarSize = keyof typeof AVATAR_SIZES;

export default function UserAvatar({
  user,
  size = "sm",
  label,
  eager = false,
  className = "",
}: {
  user: AvatarUser;
  size?: UserAvatarSize;
  /** Accessible name when the picture stands alone; omit when a name is shown next to it. */
  label?: string;
  /** Load immediately (large avatars visible on arrival); lists stay lazy. */
  eager?: boolean;
  className?: string;
}) {
  const preferred = avatarSrc(user);
  const [src, setSrc] = useState(preferred);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => setSrc(preferred), [preferred]);
  // An image that failed before hydration never fires onError: check once mounted.
  useEffect(() => {
    const image = ref.current;
    if (image?.complete && image.naturalWidth === 0) fallBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  function fallBack() {
    const roleDefault = defaultAvatarFor(user.role);
    const builtIn = hasRoleAccess(user.role, "WRITER") ? BUILT_IN_AVATARS.writer : BUILT_IN_AVATARS.reader;
    setSrc((current) => (current === builtIn ? current : current === roleDefault ? builtIn : roleDefault));
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={fallBack}
      className={`${AVATAR_SIZES[size]} shrink-0 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] object-cover ${className}`.trim()}
    />
  );
}
