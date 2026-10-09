import Link from "next/link";
import { auth } from "@/auth";
import { Badge, Panel, ROLE_LABELS } from "@/components/admin/ui";
import UserAvatar from "@/components/UserAvatar";
import { formatDate, formatRestrictionEnd } from "@/lib/admin/format";
import {
  MEMBER_PAGE_SIZE,
  listMembers,
  parseRoleFilter,
  parseStatusFilter,
  type MemberStatus,
} from "@/lib/admin/members";
import { MAX_BOARD_MEMBERS } from "@/lib/admin/policy";
import { hasRoleAccess } from "@/lib/roles";
import { requireAdministrationPage } from "@/lib/utils";
import { writerStatusLabel } from "@/lib/writer-studio/status";

export default async function MembersPage({
  searchParams,
}: {
  searchParams?: { q?: string; role?: string; status?: string; page?: string };
}) {
  requireAdministrationPage(await auth(), "/administration/members");

  const query = searchParams?.q ?? "";
  const role = parseRoleFilter(searchParams?.role);
  const status = parseStatusFilter(searchParams?.status);
  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
  const { members, total } = await listMembers({ query, role, status, page });
  const pageCount = Math.max(1, Math.ceil(total / MEMBER_PAGE_SIZE));

  const href = (next: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (role !== "all") params.set("role", role);
    if (status !== "all") params.set("status", status);
    if (next > 1) params.set("page", String(next));
    const search = params.toString();
    return `/administration/members${search ? `?${search}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <form method="get" className="theme-panel grid gap-3 rounded-3xl border p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end">
        <label className="block">
          <span className="theme-meta mb-1 block text-xs">Search by name or exact email</span>
          <input name="q" defaultValue={query} maxLength={100} className="ui-input w-full px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="theme-meta mb-1 block text-xs">Role</span>
          <select name="role" defaultValue={role} className="ui-input w-full px-3 py-2 text-sm">
            <option value="all">All roles</option>
            <option value="READER">Readers</option>
            <option value="WRITER">Writers</option>
            <option value="BOARD">Board</option>
            <option value="CEO">CEO</option>
          </select>
        </label>
        <label className="block">
          <span className="theme-meta mb-1 block text-xs">Status</span>
          <select name="status" defaultValue={status} className="ui-input w-full px-3 py-2 text-sm">
            <option value="all">Any status</option>
            <option value="active">Active</option>
            <option value="disciplined">Disciplined</option>
            <option value="banned">Banned</option>
          </select>
        </label>
        <button type="submit" className="story-button-primary px-5 py-2.5">
          Filter
        </button>
      </form>

      <Panel
        title={`${total.toLocaleString()} member${total === 1 ? "" : "s"}`}
        description={`Open a member to moderate their account or manage roles. Board seats are limited to ${MAX_BOARD_MEMBERS}.`}
      >
        {members.length === 0 ? (
          <p className="theme-meta rounded-2xl border border-dashed border-[var(--border-color)] px-5 py-8 text-center text-sm">
            No members match these filters.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-color)] overflow-hidden rounded-2xl border border-[var(--border-color)]">
            {members.map((member) => (
              <li key={member.id}>
                <Link
                  href={`/administration/members/${member.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--panel-hover)]"
                >
                  <UserAvatar user={member} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="theme-heading block truncate text-sm font-semibold">{member.name || "Unnamed member"}</span>
                    <span className="theme-meta mt-0.5 block text-xs">
                      Joined {formatDate(member.createdAt)}
                      {hasRoleAccess(member.role, "WRITER") ? ` · ${writerStatusLabel(member.writerStatus)}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <Badge tone={member.role === "CEO" || member.role === "BOARD" ? "accent" : "neutral"}>
                      {ROLE_LABELS[member.role] ?? member.role}
                    </Badge>
                    <StatusBadge status={member.status} endsAt={member.restrictionEndsAt} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pageCount > 1 ? (
          <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link href={href(page - 1)} className="story-button-secondary px-4 py-2">
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="theme-meta">
              Page {page} of {pageCount}
            </span>
            {page < pageCount ? (
              <Link href={href(page + 1)} className="story-button-secondary px-4 py-2">
                Next →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </Panel>
    </div>
  );
}

function StatusBadge({ status, endsAt }: { status: MemberStatus; endsAt: Date | null }) {
  if (status === "banned") return <Badge tone="danger">Banned</Badge>;
  if (status === "disciplined") return <Badge tone="warn">Disciplined to {formatRestrictionEnd(endsAt)}</Badge>;
  return <Badge tone="good">Active</Badge>;
}
