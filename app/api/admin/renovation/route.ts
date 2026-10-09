import { NextResponse } from "next/server";
import { z } from "zod";
import { setRenovationMode } from "@/lib/admin/renovation-service";
import { jsonError, parseStrictBody } from "@/lib/api/json";
import { requireApiCEO } from "@/lib/auth/guards";

// PUT: turn Renovation Mode on/off. CEO only; explicit confirmation required.
const schema = z.object({ enabled: z.boolean(), confirm: z.literal(true) }).strict();

export async function PUT(request: Request) {
  const guard = await requireApiCEO();
  if (!guard.ok) return guard.response;
  const body = await parseStrictBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const result = await setRenovationMode(guard.user.id, body.data.enabled);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Renovation mode change failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Nothing was changed.");
  }
}
