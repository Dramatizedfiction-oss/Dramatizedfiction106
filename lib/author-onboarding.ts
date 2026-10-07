import { Role, WriterStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";
import { ensureUserStudioAccess, getAccessibleStudiosForUser } from "@/lib/studios";
import type { AuthUser } from "@/auth";

export type WriterPromotionOutcome = "PROMOTED" | "ALREADY_WRITER";

export type WriterPromotionResult = {
  outcome: WriterPromotionOutcome;
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

const userSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  bio: true,
  role: true,
} as const;

const profileSelect = {
  id: true,
  userId: true,
  displayName: true,
  bio: true,
  profileImage: true,
  creatorTagline: true,
} as const;

/**
 * Self-service writer onboarding, auto-approved. The only transition it can
 * make is READER -> WRITER with writerStatus BEGINNER. It never accepts a
 * role or status from the caller, never touches another user (callers pass
 * the session user's id), and is a no-op for anyone already WRITER or above
 * (no role change, no status reset, no profile overwrite).
 */
export async function promoteUserToWriter(
  userId: string,
  input: PromoteUserToWriterInput = {},
): Promise<WriterPromotionResult> {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!currentUser) {
    throw new Error("User record not found.");
  }

  if (normalizeRole(currentUser.role) !== "READER") {
    return alreadyWriter(userId);
  }

  const displayName =
    input.displayName?.trim() || currentUser.name?.trim() || "New Writer";
  const profileImage = input.profileImage ?? currentUser.image ?? null;
  const bio = input.bio ?? currentUser.bio ?? null;

  const promoted = await prisma.$transaction(async (tx) => {
    // Conditional on still being a READER, so concurrent or repeated
    // requests promote at most once.
    const { count } = await tx.user.updateMany({
      where: { id: userId, role: Role.READER },
      data: {
        role: Role.WRITER,
        writerStatus: WriterStatus.BEGINNER,
        writerPolicyAcknowledged: true,
        name: displayName,
        image: profileImage ?? undefined,
        bio: bio ?? undefined,
      },
    });

    if (count === 0) {
      return false;
    }

    await tx.authorProfile.upsert({
      where: { userId },
      update: {
        displayName,
        profileImage: profileImage ?? undefined,
        bio: bio ?? undefined,
      },
      create: {
        userId,
        displayName,
        profileImage,
        bio,
        creatorTagline: "Creator in residence",
      },
    });

    return true;
  });

  if (!promoted) {
    return alreadyWriter(userId);
  }

  const updatedUser = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: userSelect,
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
    select: profileSelect,
  });

  return {
    outcome: "PROMOTED",
    user: { ...updatedUser, role: normalizeRole(updatedUser.role) },
    authorProfile,
    studioCount: studios.length,
  };
}

/** Read-only result for users who are already WRITER, BOARD or CEO. */
async function alreadyWriter(userId: string): Promise<WriterPromotionResult> {
  const [user, authorProfile, studios] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: userSelect }),
    prisma.authorProfile.findUnique({ where: { userId }, select: profileSelect }),
    getAccessibleStudiosForUser(userId),
  ]);

  return {
    outcome: "ALREADY_WRITER",
    user: { ...user, role: normalizeRole(user.role) },
    authorProfile,
    studioCount: studios.length,
  };
}
