import { NextResponse } from "next/server";
import { badRequest, seasonRefused, serverError } from "@/lib/api/writer-studio-request";
import { requireApiRole, requireOwnedSeason } from "@/lib/auth/guards";
import { invalidateFeed } from "@/lib/feed/invalidate";
import { prisma } from "@/lib/prisma";
import { parseSeasonFields } from "@/lib/season-rules";
import { deleteSeason } from "@/lib/seasons";

/*
 * A season of the writer's own series (Sweep G).
 * PATCH: title, description and/or status (ONGOING | COMPLETE). Omitted
 *        fields stay; blank text clears. Never changes the series' own
 *        "Series complete" switch.
 * DELETE: only an empty season, and never the last one (409 otherwise).
 */
export async function PATCH(request: Request, { params }: { params: { seasonId: string } }) {
  const guard = await requireApiRole("WRITER");
  if (!guard.ok) return guard.response;

  const owned = await requireOwnedSeason(params.seasonId, guard.user.id);
  if (!owned.ok) return owned.response;

  const raw = await request.json().catch(() => undefined);
  if (raw === undefined) return badRequest("Malformed JSON body.");
  const parsed = parseSeasonFields(raw);
  if (!parsed.ok) return badRequest(parsed.message);

  const { status, ...text } = parsed.fields;
  const completedAt =
    status === undefined || status === owned.season.status ? undefined : status === "COMPLETE" ? new Date() : null;

  try {
    const season = await prisma.season.update({
      where: { id: owned.season.id },
      data: { ...text, ...(status ? { status } : {}), ...(completedAt !== undefined ? { completedAt } : {}) },
    });
    return NextResponse.json({ success: true, season });
  } catch (error) {
    console.error("Updating a season failed.", error);
    return serverError();
  }
}

export async function DELETE(_request: Request, { params }: { params: { seasonId: string } }) {
  const guard = await requireApiRole("WRITER");
  if (!guard.ok) return guard.response;

  const owned = await requireOwnedSeason(params.seasonId, guard.user.id);
  if (!owned.ok) return owned.response;

  try {
    const result = await deleteSeason(owned.season.seriesId, owned.season.id);
    if (!result.ok) return seasonRefused(result.reason);
    invalidateFeed();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Deleting a season failed.", error);
    return serverError();
  }
}
