import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseStrictBody } from "@/lib/api/json";
import { requireApiRole } from "@/lib/auth/guards";
import { removeStoreItem, updateStoreItem } from "@/lib/store/service";

/*
 * One Store item (Administration › Back of the store, Sweep B3/D). Board and CEO only;
 * JSON 401/403 for everyone else.
 *   PATCH { name?, active? }: rename, hide or show (audited).
 *   DELETE: remove it; for an avatar, members using it fall back to the default (audited).
 */
type Context = { params: { itemId: string } };

const patchSchema = z.object({ name: z.string().max(200).optional(), active: z.boolean().optional() }).strict();

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  const body = await parseStrictBody(request, patchSchema);
  if (!body.ok) return body.response;

  try {
    const result = await updateStoreItem(guard.user.id, params.itemId, body.data);
    if (!result.ok) return jsonError(result.status, result.status === 404 ? "NOT_FOUND" : "BAD_REQUEST", result.message);
    return NextResponse.json({ item: result.item });
  } catch (error) {
    console.error("Store item update failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Please try again.");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  try {
    const result = await removeStoreItem(guard.user.id, params.itemId);
    if (!result.ok) return jsonError(result.status, "NOT_FOUND", result.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Store item removal failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Please try again.");
  }
}
