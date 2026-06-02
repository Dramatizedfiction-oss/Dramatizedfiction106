import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { promoteUserToWriter } from "@/lib/author-onboarding";

function cleanOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to become a writer." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | {
          displayName?: string;
          profileImage?: string;
          bio?: string;
        }
      | null;
    const displayName =
      cleanOptionalText(body?.displayName) ?? session.user.name ?? "New Writer";
    const profileImage = cleanOptionalText(body?.profileImage) ?? session.user.image;
    const bio = cleanOptionalText(body?.bio) ?? session.user.bio ?? null;

    if (displayName.length > 80) {
      return NextResponse.json(
        { error: "Display name must be 80 characters or fewer." },
        { status: 400 },
      );
    }

    if (bio && bio.length > 280) {
      return NextResponse.json(
        { error: "Bio must be 280 characters or fewer." },
        { status: 400 },
      );
    }

    const result = await promoteUserToWriter(session.user.id, {
      displayName,
      profileImage,
      bio,
    });

    return NextResponse.json({
      success: true,
      role: result.user.role,
      redirectTo: "/writer-studio",
      user: result.user,
      authorProfile: result.authorProfile,
      studioCount: result.studioCount,
    });
  } catch (error) {
    console.error("Failed to unlock writer access.", error);

    return NextResponse.json(
      {
        error: "Writer access could not be unlocked. Please try again.",
        code: "BECOME_WRITER_FAILED",
      },
      { status: 500 },
    );
  }
}
