import Link from "next/link";
import type { WriterProjectStatus } from "@/lib/writer-studio";

const statusStyles: Record<WriterProjectStatus, string> = {
  Draft: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  Published: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  WIP: "border-violet-400/40 bg-violet-400/10 text-violet-100",
  Scheduled: "border-amber-400/40 bg-amber-400/10 text-amber-100",
};

export default function ProjectCard({
  project,
}: {
  project: {
    title: string;
    type: string;
    status: WriterProjectStatus;
    lastEdited: string;
    coverTone: string;
    description: string;
    href: string;
  };
}) {
  return (
    <Link
      href={project.href}
      className="group grid gap-4 rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--text-secondary)] sm:grid-cols-[96px_minmax(0,1fr)]"
    >
      <div className={`aspect-[4/5] rounded-[18px] bg-gradient-to-br ${project.coverTone} shadow-lg`} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${statusStyles[project.status]}`}>
            {project.status}
          </span>
          <span className="theme-meta text-xs uppercase tracking-[0.18em]">{project.type}</span>
        </div>
        <h3 className="theme-heading mt-3 truncate text-lg font-semibold">{project.title}</h3>
        <p className="theme-body mt-2 line-clamp-2 text-sm leading-6">{project.description}</p>
        <p className="theme-meta mt-3 text-xs">{project.lastEdited}</p>
      </div>
    </Link>
  );
}
