import Link from "next/link";
import { auth } from "@/auth";
import ReportActions from "@/components/admin/ReportActions";
import { Badge, Panel } from "@/components/admin/ui";
import UserAvatar from "@/components/UserAvatar";
import { formatDate } from "@/lib/admin/format";
import { reportReasonLabel } from "@/lib/engagement-rules";
import { REPORT_PAGE_SIZE, listReports, parseReportFilter } from "@/lib/reports";
import { requireAdministrationPage } from "@/lib/utils";

/*
 * Comment reports from members. Open reports oldest first; closed ones newest
 * first. Board and CEO remove the comment (hidden, the author is not told) or
 * dismiss the report. Both are audited.
 */
export default async function ReportsPage({ searchParams }: { searchParams?: { status?: string; page?: string } }) {
  requireAdministrationPage(await auth(), "/administration/reports");

  const filter = parseReportFilter(searchParams?.status);
  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
  const { reports, total } = await listReports(filter, page);
  const pageCount = Math.max(1, Math.ceil(total / REPORT_PAGE_SIZE));
  const href = (next: { status?: string; page?: number }) => {
    const params = new URLSearchParams();
    const status = next.status ?? filter;
    if (status !== "open") params.set("status", status);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const search = params.toString();
    return `/administration/reports${search ? `?${search}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <nav aria-label="Report status" className="flex gap-2">
        {(["open", "closed"] as const).map((status) => (
          <Link
            key={status}
            href={href({ status })}
            aria-current={filter === status ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition ${
              filter === status
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {status === "open" ? "Open" : "Closed"}
          </Link>
        ))}
      </nav>

      <Panel
        title={`${total.toLocaleString()} ${filter} report${total === 1 ? "" : "s"}`}
        description="Members report comments from the episode reader. Removing a comment hides it everywhere and closes its other open reports."
      >
        {reports.length === 0 ? (
          <p className="theme-meta rounded-2xl border border-dashed border-[var(--border-color)] px-5 py-8 text-center text-sm">
            {filter === "open" ? "Nothing to review. No open reports." : "No closed reports yet."}
          </p>
        ) : (
          <ul className="space-y-3">
            {reports.map((report) => {
              const comment = report.comment;
              return (
                <li key={report.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="warn">{reportReasonLabel(report.reason)}</Badge>
                    {comment._count.reports > 1 ? <Badge>{comment._count.reports} reports</Badge> : null}
                    {comment.removedAt ? <Badge tone="danger">Comment removed</Badge> : null}
                    {report.status !== "OPEN" ? (
                      <Badge tone={report.status === "ACTIONED" ? "good" : "neutral"}>
                        {report.status === "ACTIONED" ? "Actioned" : "Dismissed"}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-start gap-3">
                    <UserAvatar user={comment.user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="theme-meta text-xs">
                        <Link href={`/administration/members/${comment.user.id}`} className="font-semibold text-[var(--text-primary)] hover:underline">
                          {comment.user.name || "Unnamed member"}
                        </Link>{" "}
                        on{" "}
                        <Link href={`/episode/${comment.episode.id}`} className="underline underline-offset-2">
                          {comment.episode.series.title} · Ep {comment.episode.episodeNumber}: {comment.episode.title}
                        </Link>{" "}
                        · {formatDate(comment.createdAt)}
                      </p>
                      <p className="theme-body mt-1 whitespace-pre-line break-words text-sm leading-6">{comment.body}</p>
                    </div>
                  </div>

                  <p className="theme-meta mt-3 text-xs leading-5">
                    Reported by {report.reporter?.name || "a deleted account"} on {formatDate(report.createdAt)}
                    {report.note ? (
                      <>
                        : <span className="whitespace-pre-line break-words text-[var(--text-primary)]">“{report.note}”</span>
                      </>
                    ) : null}
                    {report.resolvedAt ? ` · Closed ${formatDate(report.resolvedAt)}${report.resolvedBy?.name ? ` by ${report.resolvedBy.name}` : ""}` : ""}
                  </p>

                  {report.status === "OPEN" ? <ReportActions reportId={report.id} commentRemoved={Boolean(comment.removedAt)} /> : null}
                </li>
              );
            })}
          </ul>
        )}

        {pageCount > 1 ? (
          <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link href={href({ page: page - 1 })} className="story-button-secondary px-4 py-2">
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="theme-meta">
              Page {page} of {pageCount}
            </span>
            {page < pageCount ? (
              <Link href={href({ page: page + 1 })} className="story-button-secondary px-4 py-2">
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
