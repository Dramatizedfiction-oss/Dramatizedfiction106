import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { ADULT_AGE, ageOn, parseBirthDate } from "@/lib/account-rules";
import { confirmAdult } from "@/lib/account-service";

/*
 * POST { day, month, year }: voluntary 18+ confirmation. The age is checked
 * here; the birthdate is never stored or logged. Under 18: a neutral refusal
 * and nothing is written. 18+: only the time and wording version are saved.
 */
const part = z.union([z.string().max(4), z.number()]);
const schema = z.object({ day: part, month: part, year: part }).strict();

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, schema);
  if (!body.ok) return body.response;

  const birth = parseBirthDate(body.data.day, body.data.month, body.data.year);
  if (!birth) return badRequest("Please enter a real date.");

  if (ageOn(birth) < ADULT_AGE) {
    return NextResponse.json(
      { error: "We can't confirm this right now.", code: "UNDER_AGE" },
      { status: 422 },
    );
  }

  try {
    const saved = await confirmAdult(guard.user.id);
    return NextResponse.json({ confirmedAt: saved.ageConfirmedAt, version: saved.ageConfirmationVersion });
  } catch {
    console.error("Age confirmation failed.");
    return serverError();
  }
}
