import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/guards";
import { promoteUserToWriter } from "@/lib/author-onboarding";
import { decideImageField, deleteReplacedImage } from "@/lib/uploads/image-storage";

function cleanOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  try {
    // Shared guard: signed in, not restricted, platform open.
    const guard = await requireApiUser();
    if (!guard.ok) return guard.response;
    const session = { user: guard.user };

    const body = (await request.json().catch(() => null)) as
      | {
          displayName?: string;
          profileImage?: string;
          bio?: string;
          acknowledged?: boolean;
        }
      | null;

    if (!body?.acknowledged) {
      return NextResponse.json(
        { error: "Please agree to the writer guidelines before continuing." },
        { status: 400 },
      );
    }
    const displayName =
      cleanOptionalText(body?.displayName) ?? session.user.name ?? "New Writer";
    // A new picture must be an uploaded image; blank keeps the current one.
    const requestedImage = cleanOptionalText(body?.profileImage);
    const imageDecision = decideImageField(requestedImage ?? undefined, session.user.image);
    if (!imageDecision.ok) {
      return NextResponse.json({ error: imageDecision.message }, { status: 400 });
    }
    const profileImage = imageDecision.value ?? session.user.image;
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

    // Only the session user is ever affected; role/status/userId in the body
    // are never read.
    const result = await promoteUserToWriter(session.user.id, {
      displayName,
      profileImage,
      bio,
    });

    if (result.outcome === "PROMOTED") {
      await deleteReplacedImage(session.user.image, result.user.image);
    }

    return NextResponse.json({
      success: true,
      outcome: result.outcome,
      message:
        result.outcome === "PROMOTED"
          ? "Writer access granted."
          : "You already have writer access.",
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
