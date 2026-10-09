import type { Prisma, Role } from "@prisma/client";
import { activeRestriction } from "@/lib/admin/policy";
import { prisma } from "@/lib/prisma";

/*
 * Member directory queries for Administration. Selects only non-sensitive
 * fields: never password hashes, sessions, Stripe ids, or (in the list) email.
 * Email is used for searching only.
 */

export const MEMBER_PAGE_SIZE = 25;
export const MEMBER_ROLE_FILTERS = ["all", "READER", "WRITER", "BOARD", "CEO"] as const;
export const MEMBER_STATUS_FILTERS = ["all", "active", "disciplined", "banned"] as const;

export type MemberRoleFilter = (typeof MEMBER_ROLE_FILTERS)[number];
export type MemberStatusFilter = (typeof MEMBER_STATUS_FILTERS)[number];
export type MemberStatus = "active" | "disciplined" | "banned";

export function parseRoleFilter(value: string | undefined): MemberRoleFilter {
  return (MEMBER_ROLE_FILTERS as readonly string[]).includes(value ?? "") ? (value as MemberRoleFilter) : "all";
}

export function parseStatusFilter(value: string | undefined): MemberStatusFilter {
  return (MEMBER_STATUS_FILTERS as readonly string[]).includes(value ?? "") ? (value as MemberStatusFilter) : "all";
}

const restrictionSelect = { id: true, kind: true, imposedAt: true, endsAt: true, liftedAt: true } as const;

function statusWhere(status: MemberStatusFilter, now: Date): Prisma.UserWhereInput {
  const banned: Prisma.MemberRestrictionWhereInput = { kind: "BAN", liftedAt: null };
  const disciplined: Prisma.MemberRestrictionWhereInput = { kind: "DISCIPLINE", liftedAt: null, endsAt: { gt: now } };
  switch (status) {
    case "banned":
      return { restrictions: { some: banned } };
    case "disciplined":
      return { AND: [{ restrictions: { some: disciplined } }, { restrictions: { none: banned } }] };
    case "active":
      return { restrictions: { none: { OR: [banned, disciplined] } } };
    default:
      return {};
  }
}

export async function listMembers(options: {
  query: string;
  role: MemberRoleFilter;
  status: MemberStatusFilter;
  page: number;
}) {
  const now = new Date();
  const query = options.query.trim().slice(0, 100);
  const where: Prisma.UserWhereInput = {
    ...(options.role !== "all" ? { role: options.role as Role } : {}),
    ...statusWhere(options.status, now),
    ...(query
      ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { equals: query.toLowerCase() } }] }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (options.page - 1) * MEMBER_PAGE_SIZE,
      take: MEMBER_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        writerStatus: true,
        createdAt: true,
        restrictions: { where: { liftedAt: null }, select: restrictionSelect },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    total,
    members: rows.map(({ restrictions, ...member }) => {
      const active = activeRestriction(restrictions, now);
      return { ...member, status: statusOf(active?.kind), restrictionEndsAt: active?.endsAt ?? null };
    }),
  };
}

function statusOf(kind: "BAN" | "DISCIPLINE" | undefined): MemberStatus {
  return kind === "BAN" ? "banned" : kind === "DISCIPLINE" ? "disciplined" : "active";
}

/** One member, with restriction history (private reasons included: Administration only). */
export async function getMemberDetail(id: string) {
  const now = new Date();
  const member = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      writerStatus: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { series: true, episodes: true } },
      restrictions: {
        orderBy: { imposedAt: "desc" },
        take: 20,
        select: {
          ...restrictionSelect,
          reason: true,
          liftNote: true,
          imposedBy: { select: { id: true, name: true } },
          liftedBy: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!member) return null;
  const active = activeRestriction(member.restrictions, now);
  return { ...member, status: statusOf(active?.kind), activeRestriction: active };
}

export async function boardSeatsUsed() {
  return prisma.user.count({ where: { role: "BOARD" } });
}
