import type { WriterWipPreview } from "@/lib/writer-studio";

export default function WipCard({ project }: { project: WriterWipPreview }) {
  return (
    <article className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">WIP Journey</p>
          <h3 className="theme-heading mt-3 text-xl font-semibold">{project.title}</h3>
        </div>
        <span className="rounded-full border border-violet-400/40 bg-violet-400/10 px-3 py-1 text-xs text-violet-100">
          {project.progress}%
        </span>
      </div>

      <p className="theme-body mt-4 text-sm leading-6">{project.audiencePromise}</p>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--bg-primary)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-sky-400"
          style={{ width: `${project.progress}%` }}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-[18px] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <p className="theme-meta text-xs uppercase tracking-[0.2em]">Recent Update</p>
          <p className="theme-body mt-2 text-sm leading-6">{project.recentUpdate}</p>
        </div>
        <div className="rounded-[18px] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <p className="theme-meta text-xs uppercase tracking-[0.2em]">Next Milestone</p>
          <p className="theme-body mt-2 text-sm leading-6">{project.nextMilestone}</p>
        </div>
      </div>
    </article>
  );
}
