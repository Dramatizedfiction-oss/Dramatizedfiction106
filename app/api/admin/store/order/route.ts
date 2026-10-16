import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseStrictBody } from "@/lib/api/json";
import { requireApiRole } from "@/lib/auth/guards";
import { reorderStoreItems } from "@/lib/store/service";

/*
 * Set the order of one Store category (Board and CEO only):
 * { category, ids } with every item of the category exactly once; 409 when
 * the list doesn't match (someone changed the Store meanwhile). Audited.
 */
const schema = z.object({ category: z.string().max(40), ids: z.array(z.string().max(191)).max(500) }).strict();

export async function PUT(request: Request) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  const body = await parseStrictBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const result = await reorderStoreItems(guard.user.id, body.data.category, body.data.ids);
    if (!result.ok) return jsonError(result.status, result.status === 409 ? "CONFLICT" : "BAD_REQUEST", result.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Store reorder failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Please try again.");
  }
}
