import { NextResponse } from "next/server";

// Retired legacy endpoint (POST created episodes in any series; GET exposed
// drafts and full bodies). Writer Studio uses /api/writer-studio/episodes.
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

export function POST() {
  return gone();
}
