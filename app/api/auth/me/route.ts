import { NextResponse } from "next/server";
import { auth, clearSessionCookie, hasSessionCookie } from "@/auth";

export async function GET() {
  let session: Awaited<ReturnType<typeof auth>>;

  try {
    session = await auth();
  } catch (error) {
    // Lookup failed (e.g. database unavailable): the cookie may still be
    // valid, so leave it in place.
    console.error("Auth session lookup failed in /api/auth/me.", error);

    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 401 },
    );
  }

  if (!session?.user) {
    // The lookup succeeded and found no live session, so any cookie present
    // is stale.
    if (hasSessionCookie()) {
      clearSessionCookie();
    }

    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 401 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    user: session.user,
  });
}
