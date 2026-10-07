import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function comparePassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const stored = Buffer.from(storedHash, "hex");
  const derived = scryptSync(password, salt, 64);

  // A malformed stored hash is a failed login, not a crash.
  if (stored.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(stored, derived);
}
