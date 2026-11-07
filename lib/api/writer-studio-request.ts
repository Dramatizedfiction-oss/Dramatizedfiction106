import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { isPhaseTwoActive } from "@/lib/phases";
import { SEASON_REFUSALS, type SeasonRefusal } from "@/lib/season-rules";

/*
 * Request helpers for app/api/writer-studio/* (auth/ownership live in
 * lib/auth/guards.ts). Error bodies share the { error, code } shape used by
 * apiError().
 */

export function badRequest(message = "Invalid request.") {
  return NextResponse.json({ error: message, code: "BAD_REQUEST" }, { status: 400 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message, code: "CONFLICT" }, { status: 409 });
}

/** A refused season change (Sweep G): 404 when something isn't there, 409 otherwise, with the reason as the code. */
export function seasonRefused(reason: SeasonRefusal) {
  return NextResponse.json(
    { error: SEASON_REFUSALS[reason], code: reason },
    { status: reason === "NOT_FOUND" ? 404 : 409 },
  );
}

export function serverError() {
  return NextResponse.json(
    { error: "Something went wrong. Please try again.", code: "SERVER_ERROR" },
    { status: 500 },
  );
}

/**
 * Parses the JSON body against `schema`. Unknown keys are stripped, so
 * server-controlled fields (authorId, status, reads, ...) never reach Prisma.
 */
export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<{ ok: true; data: z.output<S> } | { ok: false; response: NextResponse }> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: badRequest("Malformed JSON body.") };
  }

  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, response: badRequest() };
  }

  return { ok: true, data: parsed.data };
}

export function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** An update whose `where` matched no row (Prisma P2025). */
export function isRecordNotFoundError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

/*
 * Two tabs or devices editing one episode (BUG-09, Sweep 3). The editor sends
 * the `lastSavedAt` its working copy is built on; a save is refused when the
 * stored one has moved since, instead of silently replacing the other copy.
 */
export const EDITED_ELSEWHERE_MESSAGE =
  "This episode was changed in another tab or device, so this tab stopped saving. Your changes here are kept on this device.";

export function editedElsewhere() {
  return NextResponse.json({ error: EDITED_ELSEWHERE_MESSAGE, code: "EDITED_ELSEWHERE" }, { status: 409 });
}

/** Missing: no check (older clients). Present: must be a real date, else the request is refused. */
export function parseBaseLastSavedAt(value: string | null | undefined): { ok: true; value: Date | null } | { ok: false } {
  if (value === undefined || value === null || value === "") return { ok: true, value: null };
  const time = Date.parse(value);
  return Number.isFinite(time) ? { ok: true, value: new Date(time) } : { ok: false };
}

export function cleanOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Value to write for an episode's `locked` flag, or undefined to leave it
 * unchanged. Locking is a Phase 2 (monetization) capability: while Phase 2 is
 * inactive a request can unlock but never lock. Existing rows are untouched.
 */
export async function resolveLockedUpdate(requested: boolean | undefined) {
  if (requested === false) {
    return false;
  }

  if (requested === true && (await isPhaseTwoActive())) {
    return true;
  }

  return undefined;
}

/** Text the UI may send as a string, or omit; null is treated as omitted. */
export const optionalText = z.string().nullable().optional();

/** Like optionalText, with a server-side length limit (Sweep 1). */
export const boundedText = (max: number) => z.string().max(max).nullable().optional();

/**
 * Server-side limits for Writer Studio text (Sweep 1). The titles and
 * descriptions match the editor's own maxLength; the rest are generous caps
 * so nothing unbounded reaches the database.
 */
export const STUDIO_TEXT_LIMITS = {
  seriesTitle: 150,
  seriesDescription: 2000,
  genre: 60,
  themeColor: 32,
  aiUsageTag: 20,
  imageUrl: 2048,
  episodeTitle: 200,
  episodeDescription: 1000,
  contentWarning: 300,
  /** About 150,000 words of HTML; Vercel refuses bodies over 4.5 MB anyway. */
  episodeBody: 1_000_000,
} as const;

/** Non-negative integer; null (e.g. a cleared number input) is treated as omitted. */
export const optionalCount = z.number().int().min(0).nullable().optional();

/** Reading time in minutes, capped so it always fits the database's Int. */
export const optionalReadTime = z.number().int().min(0).max(10_000).nullable().optional();
