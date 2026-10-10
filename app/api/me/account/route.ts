import { NextResponse } from "next/server";
import { z } from "zod";
import { clearSessionCookie } from "@/auth";
import { badRequest, parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { DELETE_CONFIRMATION_WORD } from "@/lib/account-rules";
import { deleteAccount } from "@/lib/account-service";

/*
 * DELETE { password, confirmation: "DELETE" }: permanently and immediately
 * deletes the signed-in member's own account (and, for writers, their stories).
 * The password is checked server-side; the last CEO is refused. All sessions
 * go with the account, and this browser's cookie is cleared.
 */
const schema = z.object({ password: z.string().max(200), confirmation: z.string().max(20) }).strict();

export async function DELETE(request: Request) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, schema);
  if (!body.ok) return body.response;
  if (body.data.confirmation !== DELETE_CONFIRMATION_WORD) return badRequest(`Type ${DELETE_CONFIRMATION_WORD} to confirm.`);

  try {
    const result = await deleteAccount(guard.user.id, body.data.password);
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });
    clearSessionCookie();
    return NextResponse.json({ deleted: true });
  } catch {
    console.error("Account deletion failed.");
    return serverError();
  }
}
