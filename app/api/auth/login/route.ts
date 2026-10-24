import { NextResponse } from "next/server";
import { EMAIL_MAX, PASSWORD_MAX } from "@/lib/account-rules";
import { comparePassword } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { isRateLimited, rateLimitedResponse, recordRateLimitHit } from "@/lib/rate-limit";
import { LOGIN_FAILURE_LIMITS } from "@/lib/rate-limit-rules";
import { createSession, persistSession } from "@/auth";

const LOGIN_FAILURE = "login-failed";

function invalidCredentials() {
  return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
}

/*
 * Sign-in. Failed passwords are counted per account (LOGIN_FAILURE_LIMITS);
 * an account over the limit gets 429 before its password is checked. Unknown
 * emails get the same 401 as a wrong password, and over-long input is refused
 * without hashing it.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        email?: string;
        password?: string;
      }
    | null;

  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }
  if (email.length > EMAIL_MAX || password.length > PASSWORD_MAX) return invalidCredentials();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) return invalidCredentials();
  if (await isRateLimited(user.id, LOGIN_FAILURE, LOGIN_FAILURE_LIMITS)) return rateLimitedResponse();
  if (!comparePassword(password, user.passwordHash)) {
    await recordRateLimitHit(user.id, LOGIN_FAILURE);
    return invalidCredentials();
  }

  const { sessionToken, expires } = await createSession(user.id);
  persistSession(sessionToken, expires);

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
    },
    expires: expires.toISOString(),
  });
}
