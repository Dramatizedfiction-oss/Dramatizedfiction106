import { normalizeRole, type AppRole } from "@/lib/auth/roles";

/*
 * Administration rules as pure functions (no database, no framework), so the
 * decisions can be unit-tested. The services in lib/admin/*-service.ts load
 * the facts, call these, and apply the result inside a locked transaction.
 */

// ---------------------------------------------------------------- roles

export const MAX_BOARD_MEMBERS = 6;

export type RoleChange = "MAKE_BOARD" | "REMOVE_BOARD" | "MAKE_CEO" | "REMOVE_CEO";
export const ROLE_CHANGES: RoleChange[] = ["MAKE_BOARD", "REMOVE_BOARD", "MAKE_CEO", "REMOVE_CEO"];

export type PolicyError = { ok: false; code: string; message: string };

export type RoleChangeInput = {
  actor: { id: string; role: string };
  target: { id: string; role: string };
  change: RoleChange;
  boardCount: number;
  ceoCount: number;
  /** The role the target had before their current BOARD/CEO role, if recorded. */
  previousRole?: string | null;
  /** Whether the target has writer history (used when no previous role is recorded). */
  targetHasWriterHistory: boolean;
};

export type RoleChangeDecision = { ok: true; from: AppRole; to: AppRole } | PolicyError;

/**
 * Board and CEO assignments. Only a CEO may make them (the CEO password is
 * checked separately, before this). Multiple CEOs are allowed (the Role enum
 * has no single-CEO constraint); the last CEO can never be removed.
 */
export function decideRoleChange(input: RoleChangeInput): RoleChangeDecision {
  const actorRole = normalizeRole(input.actor.role);
  const from = normalizeRole(input.target.role);

  if (actorRole !== "CEO") {
    return { ok: false, code: "FORBIDDEN", message: "Only the CEO can change Board and CEO roles." };
  }

  switch (input.change) {
    case "MAKE_BOARD": {
      if (from === "BOARD") return { ok: false, code: "NO_CHANGE", message: "This member is already on the Board." };
      if (from === "CEO") {
        return { ok: false, code: "INVALID", message: "Remove CEO privileges instead of moving a CEO to the Board." };
      }
      if (input.boardCount >= MAX_BOARD_MEMBERS) {
        return { ok: false, code: "BOARD_FULL", message: `The Board already has ${MAX_BOARD_MEMBERS} members.` };
      }
      return { ok: true, from, to: "BOARD" };
    }
    case "REMOVE_BOARD": {
      if (from !== "BOARD") return { ok: false, code: "INVALID", message: "This member is not on the Board." };
      return { ok: true, from, to: restoreRole(input.previousRole, input.targetHasWriterHistory, "BOARD") };
    }
    case "MAKE_CEO": {
      if (from === "CEO") return { ok: false, code: "NO_CHANGE", message: "This member is already a CEO." };
      return { ok: true, from, to: "CEO" };
    }
    case "REMOVE_CEO": {
      if (from !== "CEO") return { ok: false, code: "INVALID", message: "This member is not a CEO." };
      if (input.ceoCount <= 1) {
        return { ok: false, code: "LAST_CEO", message: "The platform must always have at least one CEO." };
      }
      const to = restoreRole(input.previousRole, input.targetHasWriterHistory, "CEO");
      if (to === "BOARD" && input.boardCount >= MAX_BOARD_MEMBERS) {
        // Falling back to Board would exceed the cap; step down to Writer/Reader instead.
        return { ok: true, from, to: input.targetHasWriterHistory ? "WRITER" : "READER" };
      }
      return { ok: true, from, to };
    }
  }
}

/**
 * The role someone returns to when a BOARD/CEO role is removed: the role they
 * had before (from the audit log), never anything higher than they are losing,
 * otherwise WRITER if they have writer history, else READER.
 */
export function restoreRole(previous: string | null | undefined, hasWriterHistory: boolean, losing: "BOARD" | "CEO"): AppRole {
  const prior = previous ? normalizeRole(previous) : null;
  const allowed: AppRole[] = losing === "CEO" ? ["READER", "WRITER", "BOARD"] : ["READER", "WRITER"];
  if (prior && allowed.includes(prior)) return prior;
  return hasWriterHistory ? "WRITER" : "READER";
}

// ---------------------------------------------------------------- moderation

export type RestrictionKind = "BAN" | "DISCIPLINE";

export type RestrictionRecord = {
  id: string;
  kind: RestrictionKind;
  imposedAt: Date;
  endsAt: Date | null;
  liftedAt: Date | null;
};

/** Active = not lifted, and (for discipline) not yet ended. A ban outranks discipline. */
export function activeRestriction<T extends RestrictionRecord>(records: T[], now: Date = new Date()): T | null {
  const active = records.filter(
    (record) => !record.liftedAt && (record.kind === "BAN" || (record.endsAt !== null && record.endsAt > now)),
  );
  return active.find((record) => record.kind === "BAN") ?? active[0] ?? null;
}

/**
 * One calendar month after `start`, clamped to the last day of the next month
 * (Jan 31 -> Feb 28/29), same time of day, in UTC.
 */
export function disciplineEndsAt(start: Date): Date {
  const end = new Date(start.getTime());
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end;
}

export type ModerationAction = "BAN" | "DISCIPLINE" | "LIFT";

/**
 * Who may moderate whom. Board members moderate Readers and Writers; only a
 * CEO may moderate Board members; nobody moderates a CEO or themselves (so the
 * platform can't lose its last way back in).
 */
export function decideModeration(input: {
  actor: { id: string; role: string };
  target: { id: string; role: string };
  action: ModerationAction;
  current: RestrictionRecord | null;
  reason: string;
}): { ok: true } | PolicyError {
  const actorRole = normalizeRole(input.actor.role);
  const targetRole = normalizeRole(input.target.role);

  if (actorRole !== "BOARD" && actorRole !== "CEO") {
    return { ok: false, code: "FORBIDDEN", message: "Only Administration can moderate members." };
  }
  if (input.actor.id === input.target.id) {
    return { ok: false, code: "FORBIDDEN", message: "You can't moderate your own account." };
  }
  if (targetRole === "CEO") {
    return { ok: false, code: "FORBIDDEN", message: "CEO accounts can't be moderated." };
  }
  if (targetRole === "BOARD" && actorRole !== "CEO") {
    return { ok: false, code: "FORBIDDEN", message: "Only the CEO can moderate Board members." };
  }

  const reason = input.reason.trim();
  if (input.action === "LIFT") {
    if (!input.current) return { ok: false, code: "INVALID", message: "This member has no active restriction." };
    return { ok: true };
  }

  if (reason.length < 3) return { ok: false, code: "INVALID", message: "Enter a reason (it stays private to Administration)." };
  if (reason.length > 1000) return { ok: false, code: "INVALID", message: "Keep the reason under 1,000 characters." };
  if (input.current?.kind === "BAN") {
    return { ok: false, code: "INVALID", message: "This member is already banned." };
  }
  if (input.current?.kind === "DISCIPLINE" && input.action === "DISCIPLINE") {
    return { ok: false, code: "INVALID", message: "This member already has an active discipline action." };
  }
  return { ok: true };
}

// ---------------------------------------------------------------- renovation

/** CEO and Board keep full access during Renovation Mode (decided policy). */
export function canBypassRenovation(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return normalized === "CEO" || normalized === "BOARD";
}

/**
 * Pages everyone can still open during Renovation Mode: signing in (so the CEO
 * and Board can get back in) and the restriction notice. Nothing else.
 */
export function isRenovationOpenPath(pathname: string) {
  return pathname === "/sign-in" || pathname.startsWith("/sign-in/");
}

/** API routes that stay open during Renovation Mode: session handling only. */
export function isRenovationOpenApi(pathname: string) {
  return (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/me" ||
    pathname === "/api/auth/validate" ||
    pathname.startsWith("/api/avatars/default/")
  );
}
