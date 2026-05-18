import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export async function POST() {
  const cookieStore = cookies();

  for (const cookieName of SESSION_COOKIE_NAMES) {
    const sessionToken = cookieStore.get(cookieName)?.value;

    if (sessionToken) {
      await prisma.session.deleteMany({
        where: {
          sessionToken,
        },
      });
    }

    cookieStore.delete(cookieName);
  }

  return NextResponse.json({ success: true });
}
