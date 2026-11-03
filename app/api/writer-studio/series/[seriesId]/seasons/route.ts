import { NextResponse } from "next/server";
import { badRequest, seasonRefused, serverError } from "@/lib/api/writer-studio-request";
import { requireApiRole, requireOwnedSeries } from "@/lib/auth/guards";
import { parseSeasonFields } from "@/lib/season-rules";
import { addSeason } from "@/lib/seasons";

/*
 * POST: add a season at the end of the writer's own series (Sweep G). Body:
 * optional title and description. It's a draft (hidden from readers) until
 * it has a published episode.
 */
export async function POST(request: Request, { params }: { params: { seriesId: string } }) {
  const guard = await requireApiRole("WRITER");
  if (!guard.ok) return guard.response;

  const owned = await requireOwnedSeries(params.seriesId, guard.user.id);
  if (!owned.ok) return owned.response;

  const raw = await request.json().catch(() => undefined);
  const parsed = parseSeasonFields(raw ?? {});
  if (!parsed.ok) return badRequest(parsed.message);

  try {
    const result = await addSeason(owned.series.id, parsed.fields);
    if (!result.ok) return seasonRefused(result.reason);
    return NextResponse.json({ success: true, season: result.season });
  } catch (error) {
    console.error("Adding a season failed.", error);
    return serverError();
  }
}
