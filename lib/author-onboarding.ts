import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasRoleAccess, normalizeRole } from "@/lib/roles";
import { ensureUserStudioAccess } from "@/lib/studios";
import type { AuthUser } from "@/auth";

export type WriterPromotionResult = {
  user: Pick<AuthUser, "id" | "name" | "email" | "image" | "bio" | "role">;
  authorProfile: {
    id: string;
    userId: string;
    displayName: string;
    bio: string | null;
    profileImage: string | null;
    creatorTagline: string | null;
  } | null;
  studioCount: number;
};

type PromoteUserToWriterInput = {
  displayName?: string | null;
  profileImage?: string | null;
  bio?: string | null;
};

export async function promoteUserToWriter(
  userId: string,
  input: PromoteUserToWriterInput = {},
): Promise<WriterPromotionResult> {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      role: true,
      writerPolicyAcknowledged: true,
      writerStatus: true,
    },
  });

  if (!currentUser) {
    throw new Error("User record not found.");
  }

  const normalizedRole = normalizeRole(currentUser.role);

  if (normalizedRole !== "READER" && !hasRoleAccess(normalizedRole, "WRITER")) {
    throw new Error("This account cannot be converted through the public writer flow.");
  }

  const displayName =
    input.displayName?.trim() || currentUser.name?.trim() || "New Writer";
  const profileImage = input.profileImage ?? currentUser.image ?? null;
  const bio = input.bio ?? currentUser.bio ?? null;

  const updatedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        role: Role.WRITER,
        writerPolicyAcknowledged: true,
        writerStatus: currentUser.writerStatus ?? "BEGINNER",
        name: displayName,
        image: profileImage ?? undefined,
        bio: bio ?? undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        role: true,
      },
    });

    await tx.authorProfile.upsert({
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

    return updated;
  });

  const studios = await ensureUserStudioAccess({
    id: updatedUser.id,
    name: updatedUser.name,
    image: updatedUser.image,
    bio: updatedUser.bio,
    role: updatedUser.role,
  });

  const authorProfile = await prisma.authorProfile.findUnique({
    where: { userId },
  });

  return {
    user: {
      ...updatedUser,
      role: "WRITER" as const,
    },
    authorProfile: authorProfile
      ? {
          id: authorProfile.id,
          userId: authorProfile.userId,
          displayName: authorProfile.displayName,
          bio: authorProfile.bio,
          profileImage: authorProfile.profileImage,
          creatorTagline: authorProfile.creatorTagline,
        }
      : null,
    studioCount: studios.length,
  };
}

export const promoteUserToAuthor = promoteUserToWriter;
