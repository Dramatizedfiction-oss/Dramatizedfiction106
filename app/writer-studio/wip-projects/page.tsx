import WipCard from "@/components/writer-studio/WipCard";
import { getMockWipProjects } from "@/lib/writer-studio";

export default function WriterStudioWipProjectsPage() {
  const projects = getMockWipProjects();

  return (
    <div className="space-y-7">
      <div>
        <p className="eyebrow">WIP Projects</p>
        <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold">
          Bring readers into the making
        </h1>
        <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
          WIP journeys turn unfinished work into a relationship: progress notes, audience promises, update logs, and milestones that make the process feel alive.
        </p>
      </div>

      <div className="grid gap-4">
        {projects.map((project) => (
          <WipCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
