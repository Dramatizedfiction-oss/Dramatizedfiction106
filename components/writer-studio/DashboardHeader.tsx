import Link from "next/link";
import type { AuthUser } from "@/auth";

export default function DashboardHeader({ user }: { user: AuthUser | null }) {
  const initials = (user?.name || user?.email || "Writer")
    .split(/[ @]/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 md:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_15%_0%,rgba(124,58,237,0.18),transparent_65%)]" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="eyebrow">Creator Workspace</p>
          <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold md:text-5xl">
            Writer Studio
          </h1>
          <p className="theme-meta mt-3 text-base">Build stories. Grow your audience.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] text-base font-semibold">
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt={user.name || "Writer profile"} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <Link href="/writer-studio/new-episode" className="story-button-primary">
            Quick Publish
          </Link>
        </div>
      </div>
    </section>
  );
}
