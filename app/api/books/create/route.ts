import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const data = await req.json();

  return NextResponse.json({ success: true, data });
}
