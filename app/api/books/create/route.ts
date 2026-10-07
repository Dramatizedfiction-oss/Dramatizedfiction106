import { NextResponse } from "next/server";

// Retired legacy stub (echoed the request body; never persisted anything).
export const dynamic = "force-dynamic";

export function POST() {
  return NextResponse.json(
    { error: "LEGACY_ENDPOINT", message: "This endpoint is no longer supported." },
    { status: 410 },
  );
}
