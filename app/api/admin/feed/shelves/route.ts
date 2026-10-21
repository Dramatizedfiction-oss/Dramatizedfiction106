import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseStrictBody } from "@/lib/api/json";
import { requireApiRole } from "@/lib/auth/guards";
import { createTagShelf, reorderShelves } from "@/lib/feed/admin";

/*
 * Administration > Feed shelves (Board and CEO; audited).
 *   POST { name, tags, genres?, months?, weight? }  adds a tag shelf (tags from
 *        the fixed list only; optional genres and seasonal months).
 *   PUT  { ids }  reorders: every shelf id, in the new order.
 * JSON only: 400, 401, 403, 503.
 */
const createSchema = z
  .object({
    name: z.string().max(200),
    tags: z.array(z.string().max(60)).max(10),
    genres: z.array(z.string().max(40)).max(10).optional(),
    months: z.array(z.number().int()).max(12).optional(),
    weight: z.number().optional(),
  })
  .strict();

const orderSchema = z.object({ ids: z.array(z.string().max(64)).max(200) }).strict();

export async function POST(request: Request) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  const body = await parseStrictBody(request, createSchema);
  if (!body.ok) return body.response;
  try {
    const result = await createTagShelf(guard.user.id, {
      name: body.data.name,
      tags: body.data.tags,
      genres: body.data.genres ?? [],
      months: body.data.months ?? [],
      weight: body.data.weight ?? 1,
    });
    if (!result.ok) return jsonError(result.status, result.code, result.message);
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    console.error("Add feed shelf failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Nothing was changed.");
  }
}

export async function PUT(request: Request) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  const body = await parseStrictBody(request, orderSchema);
  if (!body.ok) return body.response;
  try {
    const result = await reorderShelves(guard.user.id, body.data.ids);
    if (!result.ok) return jsonError(result.status, result.code, result.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder feed shelves failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Nothing was changed.");
  }
}
