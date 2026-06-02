import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureUserStudioAccess } from "@/lib/studios";
import type { AuthUser } from "@/auth";

export type AuthorPromotionResult = {
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

export async function promoteUserToAuthor(userId: string): Promise<AuthorPromotionResult> {
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

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      role: Role.AUTHOR,
      writerPolicyAcknowledged: true,
      writerStatus: currentUser.writerStatus ?? "BEGINNER",
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
