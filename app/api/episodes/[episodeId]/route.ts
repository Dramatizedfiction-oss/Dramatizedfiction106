import { NextResponse } from "next/server";

// Retired legacy endpoint (PATCH edited any episode; GET exposed drafts and
// locked bodies). Writer Studio uses /api/writer-studio/episodes/[episodeId].
// Deletion is CEO-only and will get its own protected endpoint.
export const dynamic = "force-dynamic";

function gone() {
  return NextResponse.json(
    { error: "LEGACY_ENDPOINT", message: "This endpoint is no longer supported." },
    { status: 410 },
  );
}

export function GET() {
  return gone();
}

export function PATCH() {
  return gone();
}

export function DELETE() {
  return gone();
}
