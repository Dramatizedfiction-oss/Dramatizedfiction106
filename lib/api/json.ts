import { NextResponse } from "next/server";
import type { z } from "zod";

/*
 * Small helpers for the Administration / CEO Studio route handlers. Bodies are
 * parsed against strict schemas: unknown keys reject the request.
 */

export function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, code, ...extra }, { status });
}

export async function parseStrictBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<{ ok: true; data: z.output<S> } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: jsonError(400, "BAD_REQUEST", "Malformed request.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, response: jsonError(400, "BAD_REQUEST", "Invalid request.") };
  return { ok: true, data: parsed.data };
}
