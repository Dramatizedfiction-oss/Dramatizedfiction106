import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/*
 * Integration test helpers. Only ever run through scripts/test-integration.mjs,
 * which verifies DATABASE_URL is the development database. Every record made
 * here is tagged so cleanup only touches test data.
 */

if (process.env.DF_INTEGRATION !== "1") {
  throw new Error("Integration tests must be run with `node scripts/test-integration.mjs` (development database only).");
}

export const TAG = `itest-${Date.now()}-${randomBytes(3).toString("hex")}`;
export const BASE_URL = process.env.DF_TEST_BASE_URL ?? "http://localhost:3000";
export const COOKIE = "df.session-token";

const created: string[] = [];

export async function makeUser(role: "READER" | "WRITER" | "BOARD" | "CEO", label: string) {
  const user = await prisma.user.create({
    data: {
      name: `${TAG} ${label}`,
      email: `${TAG}-${label}@example.invalid`,
      role,
      writerPolicyAcknowledged: role !== "READER",
    },
    select: { id: true, role: true },
  });
  created.push(user.id);
  return user;
}

/** A real session row for the user, so HTTP tests act exactly like a signed-in browser. */
export async function sessionCookie(userId: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({ data: { sessionToken: token, userId, expires: new Date(Date.now() + 60 * 60 * 1000) } });
  return `${COOKIE}=${token}`;
}

export async function cleanup() {
  if (created.length === 0) return;
  await prisma.adminAuditLog.deleteMany({ where: { OR: [{ actorId: { in: created } }, { targetUserId: { in: created } }] } });
  await prisma.user.deleteMany({ where: { id: { in: created } } }); // cascades sessions, restrictions, series
  created.length = 0;
}

export async function serverReachable() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, { redirect: "manual" });
    return response.status === 200 || response.status === 401;
  } catch {
    return false;
  }
}
