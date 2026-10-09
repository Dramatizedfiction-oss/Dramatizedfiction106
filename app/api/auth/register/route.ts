import { NextResponse } from "next/server";
import { createSession, persistSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-utils";
import { requirePlatformOpen } from "@/lib/auth/guards";

export async function POST(request: Request) {
  // No new accounts while the platform is closed for renovation.
  const open = await requirePlatformOpen();
  if (!open.ok) return open.response;

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        email?: string;
        password?: string;
      }
    | null;

  // Non-string values are treated as missing (400), never passed on.
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash: hashPassword(password),
    },
    create: {
      name,
      email,
      passwordHash: hashPassword(password),
      role: "READER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
  });

  const { sessionToken, expires } = await createSession(user.id);
  persistSession(sessionToken, expires);

  return NextResponse.json(
    {
      id: user.id,
      user,
      expires: expires.toISOString(),
    },
    { status: 201 },
  );
}
