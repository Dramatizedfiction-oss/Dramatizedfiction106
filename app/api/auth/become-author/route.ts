import { NextResponse } from "next/server";

// Retired duplicate of /api/become-author (the route the UI uses). Kept as a
// 410 so it cannot be used as a role-change shortcut.
export const dynamic = "force-dynamic";

export function POST() {
  return NextResponse.json(
    { error: "LEGACY_ENDPOINT", message: "This endpoint is no longer supported." },
    { status: 410 },
  );
}
