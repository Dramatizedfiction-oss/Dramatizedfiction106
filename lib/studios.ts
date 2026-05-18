import { prisma } from "@/lib/prisma";
import { hasRoleAccess, normalizeRole, type AppRole } from "@/lib/roles";

export type AccessibleStudio = {
  id: string;
  name: string;
  slug: string;
  kind: "PERSONAL" | "SHARED" | "OFFICIAL" | "EXECUTIVE";
  description: string | null;
  accessRole: "MEMBER" | "EDITOR" | "MANAGER" | "OWNER";
};

type SessionLikeUser = {
  id: string;
  name?: string | null;
  image?: string | null;
  bio?: string | null;
  role?: string | null;
};

function slugifyStudioName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function getPersonalStudioDefinition(user: SessionLikeUser) {
  const seed = user.name?.trim() || "author";
  const safeSeed = slugifyStudioName(seed) || "author";

  return {
    name: `${seed}'s Studio`,
    slug: `studio-${safeSeed}-${user.id.slice(0, 6)}`,
    description: "Personal creator workspace for drafting, publishing, and story development.",
    kind: "PERSONAL" as const,
  };
}

const OFFICIAL_STUDIO = {
  name: "Platform Studio",
  slug: "platform-studio",
  description: "Shared platform workspace for moderation, curation, and publishing operations.",
  kind: "OFFICIAL" as const,
};

const EXECUTIVE_STUDIO = {
  name: "Executive Studio",
  slug: "executive-studio",
  description: "Executive workspace for platform-wide visibility, planning, and strategic controls.",
  kind: "EXECUTIVE" as const,
};

async function findOrCreateStudio(params: {
  name: string;
  slug: string;
  description: string;
  kind: "PERSONAL" | "SHARED" | "OFFICIAL" | "EXECUTIVE";
  ownerId?: string;
}) {
  const existing = await prisma.studio.findUnique({
    where: {
      slug: params.slug,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.studio.create({
    data: {
      name: params.name,
      slug: params.slug,
      description: params.description,
      kind: params.kind,
      ownerId: params.ownerId,
    },
  });
}

async function ensureMembership(params: {
  userId: string;
  studioId: string;
  accessRole: "MEMBER" | "EDITOR" | "MANAGER" | "OWNER";
}) {
  await prisma.studioMembership.upsert({
    where: {
      userId_studioId: {
        userId: params.userId,
        studioId: params.studioId,
      },
    },
    update: {
      accessRole: params.accessRole,
    },
    create: {
      userId: params.userId,
      studioId: params.studioId,
      accessRole: params.accessRole,
    },
  });
}

async function ensureAuthorProfile(user: SessionLikeUser) {
  const normalizedRole = normalizeRole(user.role);

  if (!hasRoleAccess(normalizedRole, "WRITER")) {
    return null;
  }

  return prisma.authorProfile.upsert({
    where: {
      userId: user.id,
    },
    update: {
      displayName: user.name?.trim() || "Unnamed Author",
      profileImage: user.image ?? undefined,
      bio: user.bio ?? undefined,
    },
    create: {
      userId: user.id,
      displayName: user.name?.trim() || "Unnamed Author",
      profileImage: user.image ?? undefined,
      bio: user.bio ?? undefined,
      creatorTagline: "Creator in residence",
    },
  });
}

export async function ensureUserStudioAccess(user: SessionLikeUser) {
  const normalizedRole = normalizeRole(user.role);

  if (!hasRoleAccess(normalizedRole, "WRITER")) {
    return [];
  }

  await ensureAuthorProfile(user);

  const personalStudio = await findOrCreateStudio({
    ...getPersonalStudioDefinition(user),
    ownerId: user.id,
  });

  await ensureMembership({
    userId: user.id,
    studioId: personalStudio.id,
    accessRole: "OWNER",
  });

  if (hasRoleAccess(normalizedRole, "BOARD")) {
    const officialStudio = await findOrCreateStudio(OFFICIAL_STUDIO);

    await ensureMembership({
      userId: user.id,
      studioId: officialStudio.id,
      accessRole: hasRoleAccess(normalizedRole, "CEO") ? "OWNER" : "MANAGER",
    });
  }

  if (hasRoleAccess(normalizedRole, "CEO")) {
    const executiveStudio = await findOrCreateStudio(EXECUTIVE_STUDIO);

    await ensureMembership({
      userId: user.id,
      studioId: executiveStudio.id,
      accessRole: "OWNER",
    });
  }

  return getAccessibleStudiosForUser(user.id);
}

export async function getAccessibleStudiosForUser(userId: string): Promise<AccessibleStudio[]> {
  const memberships = await prisma.studioMembership.findMany({
    where: {
      userId,
    },
    include: {
      studio: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return memberships
    .sort((left, right) => left.studio.kind.localeCompare(right.studio.kind))
    .map((membership) => ({
    id: membership.studio.id,
    name: membership.studio.name,
    slug: membership.studio.slug,
    kind: membership.studio.kind,
    description: membership.studio.description,
    accessRole: membership.accessRole,
    }));
}

export async function getWriterStudioContext(user: SessionLikeUser) {
  const studios = await ensureUserStudioAccess(user);
  const authorProfile = await prisma.authorProfile.findUnique({
    where: {
      userId: user.id,
    },
  });

  return {
    authorProfile,
    studios,
  };
}

export async function requireStudioAccess(userId: string, studioSlug: string) {
  const membership = await prisma.studioMembership.findFirst({
    where: {
      userId,
      studio: {
        slug: studioSlug,
      },
    },
    include: {
      studio: true,
    },
  });

  return membership;
}

export function getRoleLabel(role: AppRole | undefined | null) {
  switch (role) {
    case "WRITER":
      return "Author";
    case "BOARD":
      return "Board";
    case "CEO":
      return "CEO";
    default:
      return "User";
  }
}
