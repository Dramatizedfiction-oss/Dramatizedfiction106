import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import MemberActions from "@/components/admin/MemberActions";
import { Badge, Panel, ROLE_LABELS } from "@/components/admin/ui";
import UserAvatar from "@/components/UserAvatar";
import { formatDate, formatRestrictionEnd, remainingLabel } from "@/lib/admin/format";
import { boardSeatsUsed, getMemberDetail } from "@/lib/admin/members";
import { prisma } from "@/lib/prisma";
import { hasRoleAccess } from "@/lib/roles";
import { requireAdministrationPage } from "@/lib/utils";
import { writerStatusLabel } from "@/lib/writer-studio/status";

export default async function MemberDetailPage({ params }: { params: { memberId: string } }) {
  const viewer = requireAdministrationPage(await auth(), `/administration/members/${params.memberId}`);
  const [member, seats, ceoCount] = await Promise.all([
    getMemberDetail(params.memberId),
    boardSeatsUsed(),
    prisma.user.count({ where: { role: "CEO" } }),
  ]);
  if (!member) notFound();

  const active = member.activeRestriction;

  return (
    <div className="space-y-6">
      <Link href="/administration/members" className="theme-meta text-sm transition hover:text-[var(--text-primary)]">
        ← All members
      </Link>

      <Panel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <UserAvatar user={member} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="font-heading theme-heading break-words text-2xl font-semibold">{member.name || "Unnamed member"}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={member.role === "CEO" || member.role === "BOARD" ? "accent" : "neutral"}>
                {ROLE_LABELS[member.role] ?? member.role}
              </Badge>
              {hasRoleAccess(member.role, "WRITER") ? <Badge>{writerStatusLabel(member.writerStatus)}</Badge> : null}
              {member.status === "banned" ? (
                <Badge tone="danger">Banned</Badge>
              ) : member.status === "disciplined" && active?.endsAt ? (
                <Badge tone="warn">Disciplined · {remainingLabel(active.endsAt)}</Badge>
              ) : (
                <Badge tone="good">Active</Badge>
              )}
            </div>
            <p className="theme-meta mt-2 text-xs">
              Joined {formatDate(member.createdAt)} · {member._count.series} series · {member._count.episodes} episodes
            </p>
          </div>
        </div>
      </Panel>

      <MemberActions
        viewer={{ id: viewer.id, role: viewer.role }}
        member={{
          id: member.id,
          name: member.name || "this member",
          role: member.role,
          status: member.status,
          restrictionEndsAt: active?.endsAt?.toISOString() ?? null,
        }}
        boardSeatsUsed={seats}
        ceoCount={ceoCount}
      />

      <Panel title="Restriction history" description="Reasons are private to Administration and never shown to the member.">
        {member.restrictions.length === 0 ? (
          <p className="theme-meta text-sm">No restrictions on record.</p>
        ) : (
          <ul className="space-y-3">
            {member.restrictions.map((record) => (
              <li key={record.id} className="rounded-2xl border border-[var(--border-color)] p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={record.kind === "BAN" ? "danger" : "warn"}>
                    {record.kind === "BAN" ? "Permanent ban" : "Discipline: one month"}
                  </Badge>
                  <span className="theme-meta text-xs">
                    {formatDate(record.imposedAt)} by {record.imposedBy?.name || "a former administrator"}
                    {record.kind === "DISCIPLINE" ? ` · ends ${formatRestrictionEnd(record.endsAt)}` : ""}
                  </span>
                </div>
                <p className="theme-body mt-2 whitespace-pre-wrap break-words">{record.reason}</p>
                {record.liftedAt ? (
                  <p className="theme-meta mt-2 text-xs">
                    Lifted {formatDate(record.liftedAt)} by {record.liftedBy?.name || "a former administrator"}
                    {record.liftNote ? `: ${record.liftNote}` : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
