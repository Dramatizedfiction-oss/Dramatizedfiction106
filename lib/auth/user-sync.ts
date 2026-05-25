import type { AuthUser } from "@/auth";
import { prisma } from "@/lib/prisma";

type EnsureAppUserInput = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  bio?: string | null;
};

export async function ensureAppUser(input: EnsureAppUserInput) {
  try {
    return await prisma.user.upsert({
      where: { id: input.id },
      update: {
        name: input.name ?? undefined,
        email: input.email ?? undefined,
        image: input.image ?? undefined,
        bio: input.bio ?? undefined,
      },
      create: {
        id: input.id,
        name: input.name ?? null,
        email: input.email ?? null,
        image: input.image ?? null,
        bio: input.bio ?? null,
        role: "READER",
      },
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
        image: true,
        bio: true,
      },
    });
  } catch (error) {
    if (!input.email) {
      throw error;
    }

    const existingByEmail = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
        image: true,
        bio: true,
      },
    });

    if (!existingByEmail) {
      throw error;
    }

    console.warn("Auth session user id did not match Prisma user id.", {
      sessionUserId: input.id,
      prismaUserId: existingByEmail.id,
    });

    return existingByEmail;
  }
}

export async function ensureSessionUser(sessionUser: AuthUser) {
  return ensureAppUser({
    id: sessionUser.id,
    name: sessionUser.name,
    email: sessionUser.email,
    image: sessionUser.image,
    bio: sessionUser.bio,
  });
}
