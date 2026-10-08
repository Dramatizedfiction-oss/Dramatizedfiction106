import Link from "next/link";
import { redirect } from "next/navigation";
import EpisodeList from "@/components/writer-studio/episodes/EpisodeList";
import EpisodeStatusBadge from "@/components/writer-studio/episodes/EpisodeStatusBadge";
import StudioSeriesCard from "@/components/writer-studio/series/StudioSeriesCard";
import StudioEmptyState from "@/components/writer-studio/StudioEmptyState";
import { formatRelative } from "@/lib/writer-studio/format";
import { getStudioHome } from "@/lib/writer-studio/queries";
import { requireStudioUser } from "@/lib/writer-studio/session";

export default async function StudioHomePage({
  searchParams,
}: {
  searchParams?: { series?: string; episode?: string };
}) {
  // Links from the previous single-page studio (/writer-studio?series=&episode=).
  if (searchParams?.episode) redirect(`/writer-studio/episodes/${encodeURIComponent(searchParams.episode)}`);
  if (searchParams?.series) redirect(`/writer-studio/series/${encodeURIComponent(searchParams.series)}`);

  const user = await requireStudioUser();
  const { lastEdited, drafts, series, totals } = await getStudioHome(user.id);

  if (series.length === 0) {
    return <FirstRunGuide />;
  }

  return (
    <div className="space-y-12">
      {lastEdited ? (
        <section className="rounded-3xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-6 md:p-8">
          <p className="eyebrow">Continue writing</p>
          <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h2 className="font-heading theme-heading truncate text-2xl font-semibold md:text-3xl">
                {lastEdited.title}
              </h2>
              <p className="theme-meta mt-2 text-sm">
                {lastEdited.series.title} · Episode {lastEdited.episodeNumber} · edited{" "}
                {formatRelative(lastEdited.updatedAt)}
              </p>
              <div className="mt-3">
                <EpisodeStatusBadge status={lastEdited.status} />
              </div>
            </div>
            <Link href={`/writer-studio/episodes/${lastEdited.id}`} className="story-button-primary shrink-0">
              Open in editor
            </Link>
          </div>
        </section>
      ) : null}

      <section aria-label="At a glance" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Snapshot label="Series" value={totals.series} />
        <Snapshot label="Live episodes" value={totals.published} />
        <Snapshot label="Total reads" value={totals.readers} href="/writer-studio/stats" />
        <Snapshot label="Reads, last 30 days" value={totals.reads30} href="/writer-studio/stats" />
      </section>

      <section>
        <SectionHeading title="Drafts" href="/writer-studio/episodes?status=draft" linkLabel="All drafts" />
        {drafts.length > 0 ? (
          <EpisodeList episodes={drafts} />
        ) : (
          <p className="theme-meta rounded-2xl border border-dashed border-[var(--studio-border)] px-5 py-6 text-sm">
            No drafts right now. Start a new episode from any series.
          </p>
        )}
      </section>

      <section>
        <SectionHeading title="Your series" href="/writer-studio/series" linkLabel="All series" />
        <div className="grid gap-3 md:grid-cols-2">
          {series.slice(0, 6).map((item) => (
            <StudioSeriesCard key={item.id} series={item} />
          ))}
        </div>
        <Link href="/writer-studio/series/new" className="story-button-secondary mt-4">
          New series
        </Link>
      </section>
    </div>
  );
}

function Snapshot({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <>
      <p className="font-heading theme-heading text-3xl font-semibold">{value.toLocaleString()}</p>
      <p className="theme-meta mt-1 text-xs uppercase tracking-[0.18em]">{label}</p>
    </>
  );
  const className =
    "block rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-4 transition";

  return href ? (
    <Link href={href} className={`${className} hover:border-[var(--studio-muted)]`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function SectionHeading({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="font-heading theme-heading text-2xl font-semibold">{title}</h2>
      <Link href={href} className="theme-meta text-sm transition hover:text-[var(--text-primary)]">
        {linkLabel} →
      </Link>
    </div>
  );
}

function FirstRunGuide() {
  const steps = [
    { title: "Create a series", body: "Give your story a title, a genre and a short description." },
    { title: "Write episode 1", body: "The editor saves as you type. Preview it exactly as readers will see it." },
    { title: "Publish", body: "Choose your AI label, review, and publish. Your series goes live with it." },
  ];

  return (
    <div className="space-y-8">
      <StudioEmptyState
        title="Your studio is ready"
        description="Everything you write starts as a private draft. Nothing is visible to readers until you publish it."
        action={
          <Link href="/writer-studio/series/new" className="story-button-primary">
            Create your first series
          </Link>
        }
      />
      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-5"
          >
            <p className="font-mono-df text-xs text-[var(--studio-muted)]">Step {index + 1}</p>
            <p className="theme-heading mt-2 font-semibold">{step.title}</p>
            <p className="theme-meta mt-2 text-sm leading-6">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
