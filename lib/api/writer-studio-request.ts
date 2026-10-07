import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { isPhaseTwoActive } from "@/lib/phases";

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

/** Non-negative integer; null (e.g. a cleared number input) is treated as omitted. */
export const optionalCount = z.number().int().min(0).nullable().optional();
