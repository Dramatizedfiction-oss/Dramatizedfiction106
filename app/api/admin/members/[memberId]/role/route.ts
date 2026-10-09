import { NextResponse } from "next/server";
import { z } from "zod";
import { checkCeoPassword } from "@/lib/admin/audit";
import { ROLE_CHANGES } from "@/lib/admin/policy";
import { changeMemberRole } from "@/lib/admin/roles-service";
import { jsonError, parseStrictBody } from "@/lib/api/json";
import { requireApiCEO } from "@/lib/auth/guards";

/*
 * POST: Board/CEO role changes. CEO session AND the CEO password are both
 * required; the password is checked on the server against CEO_PASSWORD and is
 * never logged, stored or returned. The six-seat Board cap and the
 * last-CEO rule are enforced inside a locked transaction.
 */
const schema = z
  .object({
    change: z.enum(ROLE_CHANGES as [string, ...string[]]),
    ceoPassword: z.string().min(1).max(1024),
    confirm: z.literal(true),
  })
  .strict();

export async function POST(request: Request, { params }: { params: { memberId: string } }) {
  const guard = await requireApiCEO();
  if (!guard.ok) return guard.response;

  const body = await parseStrictBody(request, schema);
  if (!body.ok) return body.response;

  const password = await checkCeoPassword(guard.user.id, body.data.ceoPassword);
  if (!password.ok) return jsonError(password.status, password.code, password.message);

  try {
    const result = await changeMemberRole(guard.user.id, params.memberId, body.data.change as (typeof ROLE_CHANGES)[number]);
    if (!result.ok) return jsonError(result.status, result.code, result.message);
    return NextResponse.json({ success: true, from: result.from, to: result.to });
  } catch (error) {
    console.error("Role change failed.", error instanceof Error ? error.message : "unknown error");
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Nothing was changed.");
  }
}
