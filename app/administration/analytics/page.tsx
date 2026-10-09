import Link from "next/link";
import { auth } from "@/auth";
import { Badge, Panel, Stat } from "@/components/admin/ui";
import { getSiteAnalytics } from "@/lib/admin/analytics";
import { requireAdministrationPage } from "@/lib/utils";

const n = (value: number) => value.toLocaleString();

export default async function AnalyticsPage() {
  requireAdministrationPage(await auth(), "/administration/analytics");
  const data = await getSiteAnalytics();

  return (
    <div className="space-y-6">
      <Panel title="Accounts" description="Current number of accounts by role.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Readers" value={n(data.accounts.READER)} />
          <Stat label="Writers" value={n(data.accounts.WRITER)} />
          <Stat label="Board" value={n(data.accounts.BOARD)} />
          <Stat label="CEO" value={n(data.accounts.CEO)} />
          <Stat label="Total" value={n(data.accounts.total)} />
        </div>
      </Panel>

      <Panel
        title="Reading activity"
        description="From the read tracker: signed-in readers only, at most one read per reader per episode per day, and authors reading their own work never count."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label="Episode reads, all time" value={n(data.reads.events)} />
          <Stat label="Episode reads, 30 days" value={n(data.reads.events30)} />
          <Stat label="Unique readers, all time" value={n(data.reads.uniqueReaders)} />
          <Stat label="Unique readers, 30 days" value={n(data.reads.uniqueReaders30)} />
          <Stat
            label="Reader-episode pairs"
            value={n(data.reads.uniqueReaderEpisodePairs)}
            note="Distinct (reader, episode) combinations. This is what series “reads” add up."
          />
        </div>
      </Panel>

      <Panel title="Published content">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Published series" value={n(data.content.publishedSeries)} />
          <Stat label="Published episodes" value={n(data.content.publishedEpisodes)} />
        </div>
        {data.topSeries.length ? (
          <ul className="mt-4 divide-y divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)]">
            {data.topSeries.map((series) => (
              <li key={series.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <Link href={`/series/${series.id}`} className="theme-heading truncate font-medium hover:underline">
                  {series.title}
                </Link>
                <span className="theme-meta shrink-0 tabular-nums">{n(series.reads)} reader-episode pairs</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      <Panel title="Not measured yet" description="These can't be reported accurately because nothing records them today.">
        <ul className="space-y-3 text-sm">
          <Unavailable title="Platform views" body="Page views aren't recorded anywhere. Counting them needs a page-view tracker." />
          <Unavailable
            title="Series views"
            body="Visits to series pages aren't recorded. Series “reads” above count readers of its episodes, not page views."
          />
          <Unavailable
            title="Episode views"
            body="Only signed-in reads are recorded (see Reading activity). Anonymous visits and repeat views within a day aren't counted."
          />
          <Unavailable
            title="Campaign and promotion links"
            body="There's no campaign tracking: share links carry no campaign identifier and visits aren't attributed to a source or writer."
          />
        </ul>
      </Panel>
    </div>
  );
}

function Unavailable({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-2xl border border-dashed border-[var(--border-color)] p-4 sm:flex-row sm:items-start sm:gap-3">
      <Badge>Not tracked</Badge>
      <span>
        <span className="theme-heading font-semibold">{title}.</span> <span className="theme-meta">{body}</span>
      </span>
    </li>
  );
}
