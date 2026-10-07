import { NextResponse } from "next/server";
import type { Episode, Series } from "@prisma/client";
import { auth, type AuthUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasRoleAccess, isCEO, type AppRole } from "@/lib/roles";

/*
 * Server-side authorization helpers for route handlers.
 *
 * API guards never call redirect(). They return a discriminated result so a
 * route handler can bail out with the prepared JSON response:
 *
 *   const guard = await requireApiRole("WRITER");
 *   if (!guard.ok) return guard.response;
 *   const owned = await requireOwnedEpisode(params.episodeId, guard.user.id);
 *   if (!owned.ok) return owned.response;
 *
 * Status codes:
 *   401 UNAUTHENTICATED  no valid session
 *   403 FORBIDDEN        signed in, role too low
 *   404 NOT_FOUND        resource missing OR owned by someone else (ownership
 *                        failures are indistinguishable from missing resources)
 *
 * Page-level guards (requireRole / requireWriterStudioAccess in lib/utils.ts)
 * still redirect and remain the right tool for pages. requireRole should stop
 * being used inside app/api/* once routes migrate to these helpers.
 *
 * getSessionUser() deliberately does not memoize: auth() reads the role from
 * the database on every call so role changes apply on the next request.
 */

export type ApiErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND";

export type GuardResult<T> =
  | ({ ok: true } & T)
  | { ok: false; response: NextResponse };

const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  UNAUTHENTICATED: "You must be signed in.",
  FORBIDDEN: "You do not have permission to do that.",
  NOT_FOUND: "Not found.",
};

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
};

export function apiError(code: ApiErrorCode, message = DEFAULT_MESSAGES[code]) {
  return NextResponse.json({ error: message, code }, { status: STATUS_BY_CODE[code] });
}

/** The signed-in user (role fresh from the database), or null. */
export async function getSessionUser(): Promise<AuthUser | null> {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireApiUser(): Promise<GuardResult<{ user: AuthUser }>> {
  const user = await getSessionUser();

  if (!user?.id) {
    return { ok: false, response: apiError("UNAUTHENTICATED") };
  }

  return { ok: true, user };
}

/** Hierarchical: requireApiRole("WRITER") also admits BOARD and CEO. */
export async function requireApiRole(
  minimumRole: AppRole,
): Promise<GuardResult<{ user: AuthUser }>> {
  const guard = await requireApiUser();

  if (!guard.ok) {
    return guard;
  }

  if (!hasRoleAccess(guard.user.role, minimumRole)) {
    return { ok: false, response: apiError("FORBIDDEN") };
  }

  return guard;
}

/** CEO only. BOARD is always rejected. */
export async function requireApiCEO(): Promise<GuardResult<{ user: AuthUser }>> {
  const guard = await requireApiUser();

  if (!guard.ok) {
    return guard;
  }

  if (!isCEO(guard.user.role)) {
    return { ok: false, response: apiError("FORBIDDEN") };
  }

  return guard;
}

function isUsableId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 191;
}

/**
 * Loads a series only if `userId` is its author. Pass the id from a guard
 * result, never an id taken from the request body or query string.
 */
export async function requireOwnedSeries(
  seriesId: unknown,
  userId: string,
): Promise<GuardResult<{ series: Series }>> {
  if (!isUsableId(seriesId) || !userId) {
    return { ok: false, response: apiError("NOT_FOUND", "Series not found.") };
  }

  const series = await prisma.series.findFirst({
    where: { id: seriesId, authorId: userId },
  });

  if (!series) {
    return { ok: false, response: apiError("NOT_FOUND", "Series not found.") };
  }

  return { ok: true, series };
}

/**
 * Loads an episode only if `userId` is its author. Pass the id from a guard
 * result, never an id taken from the request body or query string.
 */
export async function requireOwnedEpisode(
  episodeId: unknown,
  userId: string,
): Promise<GuardResult<{ episode: Episode }>> {
  if (!isUsableId(episodeId) || !userId) {
    return { ok: false, response: apiError("NOT_FOUND", "Episode not found.") };
  }

  const episode = await prisma.episode.findFirst({
    where: { id: episodeId, authorId: userId },
  });

  if (!episode) {
    return { ok: false, response: apiError("NOT_FOUND", "Episode not found.") };
  }

  return { ok: true, episode };
}

// Implemented in a client-safe module so sign-in UI can use it too.
export { safeCallbackPath } from "@/lib/safe-callback";
