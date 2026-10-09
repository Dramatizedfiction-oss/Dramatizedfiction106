import { createHash, timingSafeEqual } from "node:crypto";

/*
 * CEO password check for sensitive actions (Board/CEO role changes, phase
 * activation). Server-only.
 *
 * - The expected value comes from CEO_PASSWORD (server-only; never NEXT_PUBLIC_).
 * - Missing or too-short configuration fails closed: nothing is authorized.
 * - Both values are hashed and compared in constant time.
 * - Neither value is ever logged, returned or stored. Callers must also verify
 *   that the signed-in user is a CEO; the password alone authorizes nothing.
 */

export const CEO_PASSWORD_ENV = "CEO_PASSWORD";
export const MIN_CEO_PASSWORD_LENGTH = 12;

export type CeoPasswordCheck = "OK" | "INVALID" | "NOT_CONFIGURED";

export function verifyCeoPassword(
  submitted: unknown,
  configured: string | undefined = process.env[CEO_PASSWORD_ENV],
): CeoPasswordCheck {
  if (!configured || configured.length < MIN_CEO_PASSWORD_LENGTH) return "NOT_CONFIGURED";
  if (typeof submitted !== "string" || submitted.length === 0 || submitted.length > 1024) return "INVALID";

  const expected = createHash("sha256").update(configured, "utf8").digest();
  const actual = createHash("sha256").update(submitted, "utf8").digest();
  return timingSafeEqual(expected, actual) ? "OK" : "INVALID";
}

export function ceoPasswordMessage(check: Exclude<CeoPasswordCheck, "OK">) {
  return check === "NOT_CONFIGURED"
    ? `CEO password verification isn't configured on the server (${CEO_PASSWORD_ENV} is missing or shorter than ${MIN_CEO_PASSWORD_LENGTH} characters). Nothing was changed.`
    : "That CEO password is incorrect. Nothing was changed.";
}

/** Failed attempts allowed per CEO account within the window before a cool-down. */
export const CEO_PASSWORD_MAX_FAILURES = 5;
export const CEO_PASSWORD_WINDOW_MS = 15 * 60 * 1000;
