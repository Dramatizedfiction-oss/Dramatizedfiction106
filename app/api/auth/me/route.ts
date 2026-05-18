import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
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
