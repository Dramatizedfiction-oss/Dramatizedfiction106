import { NextResponse } from "next/server";

// Retired legacy endpoint (PATCH wrote the raw request body into any series;
// GET exposed drafts and episode bodies). Writer Studio uses
// /api/writer-studio/series/[seriesId]. Deletion is CEO-only and will get its
// own protected endpoint.
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
