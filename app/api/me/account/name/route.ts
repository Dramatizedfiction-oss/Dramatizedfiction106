import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { DISPLAY_NAME_MAX, DISPLAY_NAME_MIN, normalizeDisplayName } from "@/lib/account-rules";
import { changeDisplayName } from "@/lib/account-service";

/** PATCH { name }: the signed-in member's display name (trimmed, 2–40 characters). */
const schema = z.object({ name: z.string().max(500) }).strict();

export async function PATCH(request: Request) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, schema);
  if (!body.ok) return body.response;

  const name = normalizeDisplayName(body.data.name);
  if (!name) return badRequest(`Display names need ${DISPLAY_NAME_MIN}–${DISPLAY_NAME_MAX} characters.`);

  try {
    await changeDisplayName(guard.user.id, name);
    return NextResponse.json({ name });
  } catch (error) {
    console.error("Display name update failed.", error);
    return serverError();
  }
}
