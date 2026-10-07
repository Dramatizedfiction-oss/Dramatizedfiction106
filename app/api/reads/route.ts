import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { apiError, requireApiUser } from "@/lib/auth/guards";
import { recordEpisodeRead } from "@/lib/read-tracking";

// Records reader activity (see lib/read-tracking.ts for the policy). Only
// `episodeId` is accepted; user identity comes from the session and counters
// are never client-controlled.
const readSchema = z.object({
  episodeId: z.string().min(1).max(191),
});

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, readSchema);
  if (!body.ok) return body.response;

  try {
    const outcome = await recordEpisodeRead(guard.user.id, body.data.episodeId);

    if (outcome.status === "NOT_READABLE") {
      return apiError("NOT_FOUND", "Episode not found.");
    }

    return NextResponse.json({
      counted: outcome.status === "COUNTED",
      reason: outcome.status,
    });
  } catch (error) {
    console.error("Read tracking failed.", error);
    return serverError();
  }
}
