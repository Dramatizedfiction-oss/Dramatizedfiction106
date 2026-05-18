import { NextResponse } from "next/server";
import { comparePassword } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { createSession, persistSession } from "@/auth";

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

  if (!user?.passwordHash || !comparePassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
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
