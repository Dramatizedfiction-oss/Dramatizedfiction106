import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { normalizeRole, type AppRole } from "@/lib/roles";

const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-df.session-token"
    : "df.session-token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: AppRole;
};

export type AuthSession = {
  user: AuthUser;
  expires: string;
};

function getCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export async function auth(): Promise<AuthSession | null> {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findFirst({
    where: {
      sessionToken,
      expires: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
        },
      },
    },
  });

  if (!session) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      role: normalizeRole(session.user.role),
    },
    expires: session.expires.toISOString(),
  };
}

export async function createSession(userId: string) {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  return {
    sessionToken,
    expires,
  };
}

export function persistSession(sessionToken: string, expires: Date) {
  cookies().set(SESSION_COOKIE_NAME, sessionToken, getCookieOptions(expires));
}

export async function invalidateSession(sessionToken: string) {
  await prisma.session.deleteMany({
    where: {
      sessionToken,
    },
  });
}

export async function clearSession() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await invalidateSession(sessionToken);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}
