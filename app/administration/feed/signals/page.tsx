import Link from "next/link";
import { auth } from "@/auth";
import { Panel } from "@/components/admin/ui";
import { getSignals } from "@/lib/feed/admin";
import { NEW_ACCOUNT_HOURS, SIGNALS } from "@/lib/feed/config";
import { requireAdministrationPage } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Administration > Feed > Signals (Sweep C): patterns worth a look. Reported only; nothing happens automatically.
export default async function FeedSignalsPage() {
  requireAdministrationPage(await auth());
  const signals = await getSignals();

  return (
    <div className="space-y-6">
      <Link href="/administration/feed" className="theme-meta inline-flex min-h-11 items-center text-sm hover:text-[var(--accent)]">
        ← Feed
      </Link>
      <p className="theme-meta max-w-2xl text-sm leading-6">
        Patterns from the last 7 days that may be someone gaming the feed. Nothing is changed automatically: open a series to see its numbers and hold it if needed.
        New-account activity already counts for nothing in the feed.
      </p>

      <Panel
        title="Activity mostly from new accounts"
        description={`Series where at least ${SIGNALS.newAccountShare * 100}% of ratings, bookmarks and follows came from accounts under ${NEW_ACCOUNT_HOURS} hours old (${SIGNALS.newAccountMinEvents}+ actions).`}
      >
        <SignalList
          empty="Nothing found."
          rows={signals.newAccountSeries.map((row) => ({
            key: row.id,
            href: `/administration/feed/series/${row.id}`,
            title: row.title,
            detail: `${row.fromNew} of ${row.total} from new accounts`,
          }))}
        />
      </Panel>

      <Panel title="Rating bursts" description={`Members who rated more than ${SIGNALS.ratingsPerHour} episodes within one hour.`}>
        <SignalList
          empty="Nothing found."
          rows={signals.heavyRaters.map((row) => ({
            key: `${row.id}-${row.hour.toISOString()}`,
            href: `/administration/members/${row.id}`,
            title: row.name ?? "Unnamed member",
            detail: `${row.count} ratings, hour of ${row.hour.toISOString().replace("T", " ").slice(0, 16)} UTC`,
          }))}
        />
      </Panel>

      <Panel title="Sudden spikes" description={`Series with ${SIGNALS.spikeMinEvents}+ actions this week and at least ${SIGNALS.spikeFactor}× last week's.`}>
        <SignalList
          empty="Nothing found."
          rows={signals.spikes.map((row) => ({
            key: row.id,
            href: `/administration/feed/series/${row.id}`,
            title: row.title,
            detail: `${row.thisWeek} this week · ${row.lastWeek} last week`,
          }))}
        />
      </Panel>
    </div>
  );
}

function SignalList({ rows, empty }: { rows: { key: string; href: string; title: string; detail: string }[]; empty: string }) {
  if (!rows.length) return <p className="theme-meta text-sm">{empty}</p>;
  return (
    <ul className="divide-y divide-[var(--border-color)]">
      {rows.map((row) => (
        <li key={row.key}>
          <Link href={row.href} className="flex min-h-11 flex-col justify-center gap-0.5 py-2 hover:text-[var(--accent)] sm:flex-row sm:items-center sm:justify-between">
            <span className="theme-heading text-sm font-semibold">{row.title}</span>
            <span className="theme-meta text-sm">{row.detail}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
