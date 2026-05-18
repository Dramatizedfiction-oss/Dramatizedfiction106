import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  return NextResponse.json({
    valid: Boolean(session?.user),
    expires: session?.expires ?? null,
    role: session?.user?.role ?? null,
  });
}
