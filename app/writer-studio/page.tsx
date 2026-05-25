import { auth } from "@/auth";
import CreatorCard from "@/components/writer-studio/CreatorCard";
import DashboardHeader from "@/components/writer-studio/DashboardHeader";
import ProjectCard from "@/components/writer-studio/ProjectCard";
import QuickActions from "@/components/writer-studio/QuickActions";
import { getMockRecentProjects } from "@/lib/writer-studio";

export default async function WriterStudioHomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return <p className="theme-meta">Sign in to view your studio.</p>;
  }

  const projects = getMockRecentProjects(session.user.id);

  return (
    <div className="space-y-7">
      <DashboardHeader user={session.user} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CreatorCard label="Total Stories" value="12" detail="Published, drafted, and scheduled story entries." />
        <CreatorCard label="Series" value="4" detail="Story worlds with active audience paths." />
        <CreatorCard label="Drafts" value="7" detail="Working pieces waiting for the next pass." />
        <CreatorCard label="Followers" value="1.8k" detail="Readers following your creator profile." />
        <CreatorCard label="Reads" value="28.4k" detail="Placeholder momentum across recent releases." />
        <CreatorCard label="Recent Engagement" value="+14%" detail="Mock signal for comments, saves, and returns." />
      </div>

      <QuickActions />

      <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Recent Projects</p>
            <h2 className="theme-heading mt-3 text-2xl font-semibold">
              Pick up where the story still has heat
            </h2>
            <p className="theme-meta mt-2 text-sm">
              A realistic creator queue for stories, drafts, WIP journeys, and scheduled releases.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>
    </div>
  );
}
