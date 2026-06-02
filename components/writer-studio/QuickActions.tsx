import Link from "next/link";

const actions = [
  { href: "/writer-studio/stories", label: "New Story", description: "Start a standalone piece or pilot." },
  { href: "/series/new", label: "New Series", description: "Create a new story world." },
  { href: "/writer-studio/drafts", label: "Continue Writing", description: "Return to your active drafts." },
  { href: "/writer-studio/media", label: "Upload Cover", description: "Prepare covers and visual assets." },
  { href: "/writer-studio/wip-projects", label: "Start WIP Journey", description: "Bring readers into the process." },
];

export default function QuickActions() {
  return (
    <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Quick Actions</p>
          <h2 className="theme-heading mt-3 text-2xl font-semibold">Move the work forward</h2>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4 transition duration-200 hover:-translate-y-1 hover:border-[var(--text-secondary)] hover:shadow-glow"
          >
            <p className="theme-heading text-sm font-semibold">{action.label}</p>
            <p className="theme-meta mt-2 text-xs leading-5">{action.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
