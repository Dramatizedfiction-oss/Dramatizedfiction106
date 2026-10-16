import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { parseDeviceFollowIds } from "@/lib/author-follow-rules";
import { importDeviceFollows } from "@/lib/author-follows";
import { rateLimitedResponse, takeRateLimit } from "@/lib/rate-limit";
import { FOLLOW_RATE_LIMITS } from "@/lib/rate-limit-rules";

/*
 * One-time import of writers followed on this device before follows moved to
 * the account (components/follow/DeviceFollowImport). Body { authorIds: [...] };
 * only writers other than the caller are followed, at most 50. Counts as one
 * follow action for the rate limit. Answers { imported }.
 */
export async function POST(request: Request) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Malformed JSON body.");
  }
  const ids = parseDeviceFollowIds((body as { authorIds?: unknown } | null)?.authorIds);

  try {
    if (!(await takeRateLimit(guard.user.id, "follow", FOLLOW_RATE_LIMITS))) return rateLimitedResponse();
    return NextResponse.json({ imported: await importDeviceFollows(guard.user.id, ids) });
  } catch (error) {
    console.error("Device follow import failed.", error);
    return serverError();
  }
}
