import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();

    return NextResponse.json({
      valid: Boolean(session?.user),
      expires: session?.expires ?? null,
      role: session?.user?.role ?? null,
    });
  } catch (error) {
    // Lookup failure is not proof the session is invalid; report a generic error.
    console.error("Session validation failed.", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again.", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
