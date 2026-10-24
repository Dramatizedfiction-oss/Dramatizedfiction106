import Link from "next/link";
import { redirect } from "next/navigation";
import EpisodeList from "@/components/writer-studio/episodes/EpisodeList";
import StudioSeriesCard from "@/components/writer-studio/series/StudioSeriesCard";
import StudioEmptyState from "@/components/writer-studio/StudioEmptyState";
import type { ContinueBlock } from "@/lib/writer-studio/continue-block";
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
  const { continueBlock, drafts, series, totals } = await getStudioHome(user.id);

  if (series.length === 0) {
    return <FirstRunGuide />;
  }

  return (
    <div className="space-y-12">
      {/* Only with a draft to resume, or after IDLE_NUDGE_DAYS without writing (lib/writer-studio/continue-block.ts). */}
      {continueBlock ? <ContinueWriting block={continueBlock} /> : null}

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
        <Link href="/writer-studio/series/new" className="story-button-secondary mt-4 min-h-11">
          New series
        </Link>
      </section>
    </div>
  );
}

function ContinueWriting({ block }: { block: NonNullable<ContinueBlock> }) {
  const draft = block.kind === "draft" ? block.draft : null;
  const series = draft ? draft.series : block.kind === "idle" ? block.series : null;
  if (!series) return null;
  const unpublished = series.status !== "PUBLISHED";

  return (
    // The Studio's main entry point: a feature card (brand edge), not one more panel.
    <section aria-labelledby="continue-writing" className="surface-feature p-5 sm:p-6 md:p-8">
      <p id="continue-writing" className="eyebrow">
        {draft ? "Continue writing" : "Pick up where you left off"}
      </p>
      <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h2 className="font-heading theme-heading line-clamp-2 break-words text-2xl font-semibold md:text-3xl">
            {draft ? draft.title || "Untitled draft" : series.title}
          </h2>
          <p className="theme-meta mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {draft ? (
              <>
                <span className="min-w-0 truncate">{series.title}</span>
                <span aria-hidden>·</span>
                <span>Episode {draft.episodeNumber}</span>
                <span aria-hidden>·</span>
                <span>edited {formatRelative(draft.lastSavedAt)}</span>
              </>
            ) : (
              <span>Your story is ready when you are.</span>
            )}
            {unpublished ? (
              <span className="rounded-full border border-[var(--studio-border)] px-2 py-0.5 text-xs">Not published</span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 md:items-end">
          <Link
            href={draft ? `/writer-studio/episodes/${draft.id}` : `/writer-studio/series/${series.id}`}
            className="story-button-primary min-h-11 justify-center"
          >
            {draft ? "Resume draft" : "Open series"}
          </Link>
          {draft && block.kind === "draft" && block.moreDrafts > 0 ? (
            <Link
              href="/writer-studio/episodes?status=draft"
              className="theme-meta inline-flex min-h-11 items-center justify-center text-sm underline decoration-1 underline-offset-4 transition hover:text-[var(--text-primary)]"
            >
              +{block.moreDrafts} more draft{block.moreDrafts === 1 ? "" : "s"}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Snapshot({ label, value, href }: { label: string; value: number; href?: string }) {
  // A number in an inset well (same look as Administration's Stat), label above.
  const body = (
    <>
      <p className="theme-meta font-mono-df text-[10px] font-bold uppercase tracking-[0.16em]">{label}</p>
      <p className="font-heading theme-heading mt-1 text-3xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    </>
  );
  const className = "block rounded-[var(--radius-group)] bg-[var(--surface-inset)] p-4 ring-1 ring-inset ring-[var(--studio-border)] transition";

  return href ? (
    <Link href={href} className={`${className} hover:ring-[var(--studio-muted)]`}>
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
      <Link href={href} className="theme-meta inline-flex min-h-11 items-center text-sm transition hover:text-[var(--text-primary)]">
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
