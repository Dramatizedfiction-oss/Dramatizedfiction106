import { NextResponse } from "next/server";
import { auth } from "@/auth";
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
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be signed in to become an author." },
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
  const displayName = cleanOptionalText(body?.displayName) ?? session.user.name ?? "New Author";
  const profileImage = cleanOptionalText(body?.profileImage);
  const bio = cleanOptionalText(body?.bio);

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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, name: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Account not found." },
      { status: 404 },
    );
  }

  const currentRole = normalizeRole(user.role);

  if (hasRoleAccess(currentRole, "WRITER")) {
    await prisma.authorProfile.upsert({
      where: { userId: user.id },
      update: {
        displayName,
        profileImage: profileImage ?? undefined,
        bio: bio ?? undefined,
      },
      create: {
        userId: user.id,
        displayName,
        profileImage,
        bio,
        creatorTagline: "Creator in residence",
      },
    });

    return NextResponse.json({
      success: true,
      role: currentRole,
      redirectTo: "/writer-studio",
    });
  }

  if (currentRole !== "READER") {
    return NextResponse.json(
      { error: "This account cannot be converted through the public author flow." },
      { status: 403 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: "WRITER",
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
}
