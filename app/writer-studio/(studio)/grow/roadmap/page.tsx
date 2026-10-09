import AvailabilityTag from "@/components/writer-studio/grow/AvailabilityTag";
import GrowHero from "@/components/writer-studio/grow/GrowHero";
import GrowSection from "@/components/writer-studio/grow/GrowSection";
import { PHASES, ROADMAP_INTRO, forStatus, type PhaseInfo } from "@/lib/grow/content";
import { growSection } from "@/lib/grow/sections";
import { isPhaseThreeActive, isPhaseTwoActive } from "@/lib/phases";
import { getWriterProfile } from "@/lib/writer-studio/queries";
import { requireStudioUser } from "@/lib/writer-studio/session";

// Read-only view of the platform phases. Activation lives in the CEO tools
// (CEO Studio, POST /api/ceo/phases/[phase]/activate); nothing here writes settings.
export default async function GrowRoadmapPage() {
  const user = await requireStudioUser();
  const [profile, phaseTwo, phaseThree] = await Promise.all([
    getWriterProfile(user.id),
    isPhaseTwoActive(),
    isPhaseThreeActive(),
  ]);
  const active: Record<PhaseInfo["number"], boolean> = { 1: true, 2: phaseTwo, 3: phaseThree };
  const meta = growSection("/writer-studio/grow/roadmap");

  return (
    <div className="space-y-14">
      <GrowHero
        eyebrow="Roadmap"
        title={meta.title}
        body="If Dramatized Fiction keeps growing, more becomes possible. Here's how the platform is planned to open up, and where it stands today."
      />

      <GrowSection title="The phases" intro={ROADMAP_INTRO}>
        <ol className="space-y-4">
          {PHASES.map((phase) => (
            <PhaseCard
              key={phase.number}
              phase={phase}
              active={active[phase.number]}
              items={forStatus(phase.items, profile?.writerStatus)}
            />
          ))}
        </ol>
      </GrowSection>
    </div>
  );
}

function PhaseCard({
  phase,
  active,
  items,
}: {
  phase: PhaseInfo;
  active: boolean;
  items: PhaseInfo["items"];
}) {
  // Phase 1 is always on. A later phase being switched on doesn't mean its
  // writer tools exist yet, so items keep their own labels.
  const statusLabel = phase.number === 1 ? "Live now" : active ? "Switched on" : "Not active yet";

  return (
    <li
      className={`rounded-3xl border bg-[var(--studio-surface)] p-5 md:p-8 ${
        active ? "border-[var(--studio-accent)]" : "border-[var(--studio-border)]"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Phase {phase.number}</p>
          <h3 className="font-heading theme-heading mt-2 text-2xl font-semibold md:text-3xl">{phase.name}</h3>
        </div>
        <span
          className={`self-start whitespace-nowrap rounded-full border px-3 py-1 font-mono-df text-[10px] uppercase tracking-[0.2em] ${
            active
              ? "border-[var(--studio-accent)] bg-[var(--accent-soft)] text-[var(--studio-text)]"
              : "border-dashed border-[var(--studio-border)] text-[var(--studio-muted)]"
          }`}
        >
          {statusLabel}
        </span>
      </div>
      <p className="theme-body mt-3 max-w-3xl text-sm leading-6 md:text-base md:leading-7">{phase.summary}</p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.title}
            className="rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-raised)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <p className="theme-heading min-w-0 text-sm font-semibold">{item.title}</p>
              {item.availability ? <AvailabilityTag availability={item.availability} /> : null}
            </div>
            <p className="theme-meta mt-1.5 text-sm leading-6">{item.body}</p>
          </li>
        ))}
      </ul>

      {phase.note ? <p className="theme-meta mt-5 max-w-3xl text-xs leading-5">{phase.note}</p> : null}
    </li>
  );
}
