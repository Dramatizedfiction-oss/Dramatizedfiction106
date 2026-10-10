import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionCookieName } from "@/auth";
import { parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { changePassword } from "@/lib/account-service";

/*
 * POST { currentPassword, newPassword }: change the signed-in member's
 * password. The current one is verified server-side (scrypt); afterwards every
 * other session is signed out and this one stays. Passwords are never logged.
 */
const schema = z.object({ currentPassword: z.string().max(200), newPassword: z.string().max(200) }).strict();

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const result = await changePassword(guard.user.id, {
      currentPassword: body.data.currentPassword,
      newPassword: body.data.newPassword,
      currentSessionToken: cookies().get(getSessionCookieName())?.value,
    });
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });
    return NextResponse.json({ success: true });
  } catch {
    console.error("Password change failed.");
    return serverError();
  }
}
