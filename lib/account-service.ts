import { isLibraryImagePath } from "@/lib/avatar-library";
import { comparePassword, hashPassword } from "@/lib/auth-utils";
import { AGE_CONFIRMATION_VERSION, PASSWORD_MIN } from "@/lib/account-rules";
import { prisma } from "@/lib/prisma";
import { deleteReplacedImage } from "@/lib/uploads/image-storage";

/*
 * Settings > Account actions. Every function acts on the member id it is
 * given; routes only ever pass the signed-in member's own id.
 */

type Result = { ok: true } | { ok: false; status: number; code: string; message: string };
const fail = (status: number, code: string, message: string): Result => ({ ok: false, status, code, message });

/** Display name: User.name and, for writers, the AuthorProfile copy, in one transaction. */
export async function changeDisplayName(userId: string, name: string) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { name } }),
    prisma.authorProfile.updateMany({ where: { userId }, data: { displayName: name } }),
  ]);
}

/** Records a confirmed 18+ (only the time and wording version; never the birthdate). */
export async function confirmAdult(userId: string, now = new Date()) {
  return prisma.user.update({
    where: { id: userId },
    data: { ageConfirmedAt: now, ageConfirmationVersion: AGE_CONFIRMATION_VERSION },
    select: { ageConfirmedAt: true, ageConfirmationVersion: true },
  });
}

async function checkPassword(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user?.passwordHash) return false;
  return comparePassword(password, user.passwordHash);
}

/**
 * Changes the password after verifying the current one, then signs out every
 * other session of this member (the current session is kept).
 */
export async function changePassword(
  userId: string,
  input: { currentPassword: string; newPassword: string; currentSessionToken: string | undefined },
): Promise<Result> {
  if (input.newPassword.length < PASSWORD_MIN) {
    return fail(400, "WEAK_PASSWORD", `Your new password needs at least ${PASSWORD_MIN} characters.`);
  }
  if (!(await checkPassword(userId, input.currentPassword))) {
    return fail(403, "WRONG_PASSWORD", "Your current password isn't right.");
  }
  if (input.newPassword === input.currentPassword) {
    return fail(400, "SAME_PASSWORD", "Choose a password you aren't using now.");
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(input.newPassword) } }),
    prisma.session.deleteMany({
      where: { userId, ...(input.currentSessionToken ? { sessionToken: { not: input.currentSessionToken } } : {}) },
    }),
  ]);
  return { ok: true };
}

/** What deleting this account would remove (shown on the confirmation screen). */
export async function deletionSummary(userId: string) {
  const [series, episodes, follows, followersLosing, ceoCount, user] = await Promise.all([
    prisma.series.count({ where: { authorId: userId } }),
    prisma.episode.count({ where: { authorId: userId } }),
    prisma.seriesFollow.count({ where: { userId } }),
    prisma.seriesFollow.count({ where: { series: { authorId: userId }, NOT: { userId } } }),
    prisma.user.count({ where: { role: "CEO" } }),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
  ]);
  return { series, episodes, follows, followersLosing, isLastCeo: user?.role === "CEO" && ceoCount <= 1 };
}

/**
 * Deletes the member immediately, after checking their password. The database
 * cascades sessions, follows, profile, series, episodes, books and memberships
 * (see schema.prisma onDelete rules); reads/ad views/audit rows they made are
 * kept unlinked. Their personal studio would be left ownerless, so it is
 * removed too. Serialized with role changes (same advisory lock as
 * lib/admin/roles-service.ts) so the last CEO can never be deleted.
 */
export async function deleteAccount(userId: string, password: string): Promise<Result> {
  if (!(await checkPassword(userId, password))) {
    return fail(403, "WRONG_PASSWORD", "That password isn't right.");
  }

  // Uploaded images to clean up after the rows are gone (library avatars are shared: never deleted).
  const images = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true, bannerImage: true, series: { select: { coverImage: true } } },
  });

  const result = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('df:role-change'))`;
      const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (!user) return fail(404, "NOT_FOUND", "Account not found.");
      if (user.role === "CEO" && (await tx.user.count({ where: { role: "CEO" } })) <= 1) {
        return fail(409, "LAST_CEO", "You're the only CEO, so this account can't be deleted. Make someone else CEO first.");
      }
      await tx.studio.deleteMany({ where: { ownerId: userId, kind: "PERSONAL" } });
      await tx.user.delete({ where: { id: userId } });
      return { ok: true } as Result;
    },
    { maxWait: 15_000, timeout: 20_000 },
  );

  if (result.ok && images) {
    const urls = [images.image, images.bannerImage, ...images.series.map((series) => series.coverImage)];
    for (const url of urls) {
      if (url && !isLibraryImagePath(url)) await deleteReplacedImage(url, null);
    }
  }
  return result;
}
