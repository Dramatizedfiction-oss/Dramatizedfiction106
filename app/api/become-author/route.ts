import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureSessionUser } from "@/lib/auth/user-sync";
import { prisma } from "@/lib/prisma";
import { hasRoleAccess, normalizeRole } from "@/lib/roles";

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

    const user = await ensureSessionUser(session.user);
    const currentRole = normalizeRole(user.role);

    if (currentRole !== "READER" && !hasRoleAccess(currentRole, "WRITER")) {
      console.warn("Blocked invalid writer role transition.", {
        userId: user.id,
        role: currentRole,
      });

      return NextResponse.json(
        { error: "This account cannot be converted through the public writer flow." },
        { status: 403 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: currentRole === "READER" ? "WRITER" : currentRole,
        writerPolicyAcknowledged: true,
        name: displayName,
        image: profileImage ?? undefined,
        bio: bio ?? undefined,
      },
      select: {
        id: true,
        role: true,
      },
    });

    await prisma.authorProfile.upsert({
      where: { userId: updated.id },
      update: {
        displayName,
        profileImage: profileImage ?? undefined,
        bio: bio ?? undefined,
      },
      create: {
        userId: updated.id,
        displayName,
        profileImage,
        bio,
        creatorTagline: "Creator in residence",
      },
    });

    return NextResponse.json({
      success: true,
      role: normalizeRole(updated.role),
      redirectTo: "/writer-studio",
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
