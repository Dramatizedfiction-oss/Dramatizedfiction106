import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { activeRestriction } from "@/lib/admin/policy";
import { prisma } from "@/lib/prisma";
import { normalizeRole, type AppRole } from "@/lib/roles";

const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-df.session-token"
    : "df.session-token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** An active ban or discipline action. The private reason is never included. */
export type AuthRestriction = {
  kind: "BAN" | "DISCIPLINE";
  /** ISO time a discipline action ends; null for a ban. */
  endsAt: string | null;
};

export type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio?: string | null;
  role: AppRole;
  restriction: AuthRestriction | null;
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

  const now = new Date();
  const session = await prisma.session.findFirst({
    where: {
      sessionToken,
      expires: {
        gt: now,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
          role: true,
          // Active restrictions only (lib/admin/policy.ts activeRestriction
          // picks a ban over a discipline action).
          restrictions: {
            where: {
              liftedAt: null,
              OR: [{ kind: "BAN" }, { kind: "DISCIPLINE", endsAt: { gt: now } }],
            },
            select: { id: true, kind: true, imposedAt: true, endsAt: true, liftedAt: true },
          },
        },
      },
    },
  });

  if (!session) {
    // Missing/expired session = signed out. Cookies are not modified here
    // because auth() runs during Server Component rendering, where Next.js
    // forbids cookie writes. Route handlers clear stale cookies with
    // clearSessionCookie() (see app/api/auth/me).
    return null;
  }

  const restriction = activeRestriction(session.user.restrictions, now);

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      bio: session.user.bio,
      role: normalizeRole(session.user.role),
      restriction: restriction
        ? { kind: restriction.kind, endsAt: restriction.endsAt ? restriction.endsAt.toISOString() : null }
        : null,
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

  clearSessionCookie();
}

export function hasSessionCookie() {
  return Boolean(cookies().get(SESSION_COOKIE_NAME)?.value);
}

// Route handlers / server actions only. Expires the cookie with the same
// attributes it was set with; browsers ignore a "__Secure-" Set-Cookie that
// lacks the Secure flag.
export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE_NAME, "", getCookieOptions(new Date(0)));
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}
