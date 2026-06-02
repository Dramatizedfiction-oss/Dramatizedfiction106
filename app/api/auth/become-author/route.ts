import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { promoteUserToAuthor } from "@/lib/author-onboarding";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: "AUTH_REQUIRED",
        message: "Sign in before applying to become a writer.",
      },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { acknowledged?: boolean }
    | null;

  if (!body?.acknowledged) {
    return NextResponse.json(
      {
        error: "POLICY_NOT_ACKNOWLEDGED",
        message: "Please acknowledge the writer policy before applying.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await promoteUserToAuthor(session.user.id);

    return NextResponse.json({
      success: true,
      message: "Writer access granted.",
      user: result.user,
      authorProfile: result.authorProfile,
      studioCount: result.studioCount,
    });
  } catch (error) {
    console.error("Writer promotion failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown writer promotion failure.";

    return NextResponse.json(
      {
        error: "WRITER_PROMOTION_FAILED",
        message,
      },
      { status: 500 },
    );
  }
}
