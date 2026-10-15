import { NextResponse } from "next/server";
import { clearSession } from "@/auth";

/*
 * Sign out. Always answers 200 with the session cookie cleared (clearSession
 * clears it before touching the database), and never cached.
 */
export async function POST() {
  await clearSession();

  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
