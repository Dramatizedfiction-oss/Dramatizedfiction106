import { NextResponse } from "next/server";
import { z } from "zod";
import { checkCeoPassword } from "@/lib/admin/audit";
import { activatePhase } from "@/lib/ceo/phase-activation";
import { parsePhase } from "@/lib/ceo/phase-readiness";
import { jsonError, parseStrictBody } from "@/lib/api/json";
import { requireApiCEO } from "@/lib/auth/guards";

export const runtime = "nodejs";

/*
 * POST: activate Phase 2 or 3. Requires a CEO session, the CEO password
 * (checked on the server, never logged or returned) and every readiness
 * requirement. Returns only after the database change has committed.
 */
const schema = z.object({ ceoPassword: z.string().min(1).max(1024), confirm: z.literal(true) }).strict();

export async function POST(request: Request, { params }: { params: { phase: string } }) {
  const guard = await requireApiCEO();
  if (!guard.ok) return guard.response;

  const phase = parsePhase(params.phase);
  if (!phase) return jsonError(404, "NOT_FOUND", "Unknown phase.");

  const body = await parseStrictBody(request, schema);
  if (!body.ok) return body.response;

  const password = await checkCeoPassword(guard.user.id, body.data.ceoPassword);
  if (!password.ok) return jsonError(password.status, password.code, password.message);

  try {
    const result = await activatePhase(guard.user.id, phase);
    if (!result.ok) {
      return jsonError(result.status, result.code, result.message, {
        requirements: result.requirements.filter((requirement) => !requirement.met),
      });
    }
    return NextResponse.json({
      success: true,
      phase,
      alreadyActive: result.alreadyActive,
      activatedAt: result.activatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Phase activation failed.", error instanceof Error ? error.message : "unknown error");
    return jsonError(500, "SERVER_ERROR", "Activation failed and nothing was changed. Please try again.");
  }
}
