import Link from "next/link";
import AiTagBanner from "@/components/AiTagBanner";
import AiTagReportActions from "@/components/admin/AiTagReportActions";
import { Badge, Panel } from "@/components/admin/ui";
import { formatDate } from "@/lib/admin/format";
import { displayedAiTag } from "@/lib/ai-tag-banner";
import type { listAiTagReports } from "@/lib/ai-tag-reports";

type Reports = Awaited<ReturnType<typeof listAiTagReports>>["reports"];

/** Administration > Reports > AI tags: what was reported, its current tag, the suggestion, the note. */
export default function AiTagReportList({ reports, total, filter }: { reports: Reports; total: number; filter: "open" | "closed" }) {
  return (
    <Panel
      title={`${total.toLocaleString()} ${filter} AI-tag report${total === 1 ? "" : "s"}`}
      description="Members report series or episodes whose AI usage tag looks wrong. Reviewing doesn't change the tag; ask the writer to update it in Writer Studio."
    >
      {reports.length === 0 ? (
        <p className="theme-meta rounded-2xl border border-dashed border-[var(--border-color)] px-5 py-8 text-center text-sm">
          {filter === "open" ? "Nothing to review. No open AI-tag reports." : "No closed AI-tag reports yet."}
        </p>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => {
            const href = report.episode ? `/episode/${report.episode.id}` : `/series/${report.series.id}`;
            const currentTag = report.episode?.aiUsageTag ?? report.series.aiUsageTag;
            return (
              <li key={report.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="warn">{report.episode ? "Episode" : "Series"}</Badge>
                  {report.status !== "OPEN" ? (
                    <Badge tone={report.status === "ACTIONED" ? "good" : "neutral"}>{report.status === "ACTIONED" ? "Reviewed" : "Dismissed"}</Badge>
                  ) : null}
                </div>
                <p className="theme-heading mt-2 text-sm font-semibold">
                  <Link href={href} className="underline underline-offset-2">
                    {report.series.title}
                    {report.episode ? ` · Ep ${report.episode.episodeNumber}: ${report.episode.title}` : ""}
                  </Link>
                </p>
                <p className="theme-meta mt-0.5 text-xs">
                  by{" "}
                  <Link href={`/administration/members/${report.series.author.id}`} className="font-semibold text-[var(--text-primary)] hover:underline">
                    {report.series.author.name || "Unnamed writer"}
                  </Link>
                </p>
                <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-2 text-xs">
                  <div>
                    <p className="theme-meta mb-1">Current tag</p>
                    <AiTagBanner tag={currentTag} />
                  </div>
                  <div>
                    <p className="theme-meta mb-1">Suggested</p>
                    {report.suggestedTag ? <AiTagBanner tag={report.suggestedTag} /> : <span className="theme-body">Not sure</span>}
                    <span className="sr-only">{displayedAiTag(report.suggestedTag) ?? "Not sure"}</span>
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
                {report.status === "OPEN" ? <AiTagReportActions reportId={report.id} /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
