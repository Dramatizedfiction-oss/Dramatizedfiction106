import type { NextResponse } from "next/server";
import type { AuthUser } from "@/auth";
import { requireApiRole, requireApiUser, requireOwnedEpisode, requireOwnedSeries } from "@/lib/auth/guards";
import type { ImagePurpose } from "./image-purposes";

/*
 * Who may upload an image for each purpose. Server-only, built entirely on
 * the existing guards: identity comes from the session, ownership from the
 * database. A target id from the request is only ever used to look up a
 * record that must belong to the session user.
 *
 *   series-cover / episode-cover  WRITER+ and author of that series/episode
 *   profile-image / profile-banner  any signed-in user, for their own account
 *   platform-avatar                 BOARD and CEO (Administration's avatar library)
 */
export async function authorizeImageUpload(
  purpose: ImagePurpose,
  targetId: string | null,
): Promise<{ ok: true; user: AuthUser } | { ok: false; response: NextResponse }> {
  switch (purpose) {
    case "series-cover": {
      const guard = await requireApiRole("WRITER");
      if (!guard.ok) return guard;
      const owned = await requireOwnedSeries(targetId, guard.user.id);
      return owned.ok ? { ok: true, user: guard.user } : owned;
    }
    case "episode-cover": {
      const guard = await requireApiRole("WRITER");
      if (!guard.ok) return guard;
      const owned = await requireOwnedEpisode(targetId, guard.user.id);
      return owned.ok ? { ok: true, user: guard.user } : owned;
    }
    case "profile-image":
    case "profile-banner":
      return requireApiUser();
    case "platform-avatar":
      return requireApiRole("BOARD");
  }
}
