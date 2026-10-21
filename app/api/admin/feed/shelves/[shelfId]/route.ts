import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseStrictBody } from "@/lib/api/json";
import { requireApiRole } from "@/lib/auth/guards";
import { deleteShelf, updateShelf } from "@/lib/feed/admin";

/*
 * One feed shelf (Board and CEO; audited).
 *   PATCH { name?, weight?, minItems?, maxItems?, enabled?, months?, genres?, tags? }
 *         (genres/tags only for tag and genre shelves; checked in lib/feed/shelf-rules.ts)
 *   DELETE  admin-added shelves only; built-in ones are switched off instead.
 * JSON only: 400, 401, 403, 404, 503.
 */
type Context = { params: { shelfId: string } };

const schema = z
  .object({
    name: z.string().max(200).optional(),
    weight: z.number().optional(),
    minItems: z.number().int().optional(),
    maxItems: z.number().int().optional(),
    enabled: z.boolean().optional(),
    months: z.array(z.number().int()).max(12).optional(),
    genres: z.array(z.string().max(40)).max(10).optional(),
    tags: z.array(z.string().max(60)).max(10).optional(),
  })
  .strict();

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  const body = await parseStrictBody(request, schema);
  if (!body.ok) return body.response;
  try {
    const result = await updateShelf(guard.user.id, params.shelfId, body.data);
    if (!result.ok) return jsonError(result.status, result.code, result.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update feed shelf failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Nothing was changed.");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  try {
    const result = await deleteShelf(guard.user.id, params.shelfId);
    if (!result.ok) return jsonError(result.status, result.code, result.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete feed shelf failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Nothing was changed.");
  }
}
