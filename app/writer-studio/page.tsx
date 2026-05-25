import { auth } from "@/auth";
import CreatorCard from "@/components/writer-studio/CreatorCard";
import DashboardHeader from "@/components/writer-studio/DashboardHeader";
import ProjectCard from "@/components/writer-studio/ProjectCard";
import QuickActions from "@/components/writer-studio/QuickActions";
import { getMockRecentProjects } from "@/lib/writer-studio";
import { prisma } from "@/lib/prisma";

export default async function WriterStudioHomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return <p className="theme-meta">Sign in to view your studio.</p>;
  }

  const [seriesCount, episodeCount] = await Promise.all([
    prisma.series.count({ where: { authorId: session.user.id } }),
    prisma.episode.count({ where: { authorId: session.user.id } }),
  ]);
  const hasCreatorWork = seriesCount > 0 || episodeCount > 0;
  const projects = hasCreatorWork ? getMockRecentProjects(session.user.id) : [];

  return (
    <div className="space-y-7">
      <DashboardHeader user={session.user} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CreatorCard label="Stories" value={String(episodeCount)} detail="Published and drafted story entries." />
        <CreatorCard label="Series" value={String(seriesCount)} detail="Story worlds with active audience paths." />
        <CreatorCard label="Drafts" value={hasCreatorWork ? "3" : "0"} detail="Working pieces waiting for the next pass." />
        <CreatorCard label="Followers" value="Soon" detail="Audience growth tools unlock in a future phase." />
        <CreatorCard label="Reads" value="Soon" detail="Reader momentum will surface after publishing." />
        <CreatorCard label="Engagement" value="Soon" detail="Future saves, comments, and return-reader signals." />
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

        {projects.length > 0 ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[24px] border border-dashed border-[var(--border-color)] bg-[var(--bg-primary)] p-6">
            <p className="theme-heading text-xl font-semibold">Your first story starts here.</p>
            <p className="theme-meta mt-3 max-w-2xl text-sm leading-6">
              Create your first series, draft an opening episode, or start a WIP journey so readers can begin following the work before everything is finished.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
