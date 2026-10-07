import { NextResponse } from "next/server";

// Retired legacy endpoint (no ownership checks, exposed drafts).
// Writer Studio uses /api/writer-studio/series instead.
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
