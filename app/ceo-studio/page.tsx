import Link from "next/link";
import { auth } from "@/auth";
import { Badge } from "@/components/admin/ui";
import { FeatureCard } from "@/components/ui/Surface";
import { formatDate } from "@/lib/admin/format";
import { PHASE_EXPLANATIONS, evaluatePhaseReadiness, type PhaseNumber } from "@/lib/ceo/phase-readiness";
import { getPlatformSettings } from "@/lib/phases";
import { requireCEOPage } from "@/lib/utils";

export const metadata = { title: "CEO Studio" };

// CEO Studio: CEO only (Board is redirected to Administration on the server).
export default async function CeoStudioPage() {
  requireCEOPage(await auth());
  const settings = await getPlatformSettings();

  const phases: { phase: PhaseNumber; active: boolean; activatedAt: Date | null }[] = [
    { phase: 2, active: settings.phaseTwoUnlocked && settings.enablePayments, activatedAt: settings.phaseTwoActivatedAt },
    { phase: 3, active: settings.phaseThreeUnlocked && settings.enableAds, activatedAt: settings.phaseThreeActivatedAt },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-6 md:px-8 md:pt-8">
      <header>
        <p className="eyebrow">CEO only</p>
        <h1 className="font-heading theme-heading mt-2 text-3xl font-semibold md:text-4xl">CEO Studio</h1>
        <p className="theme-meta mt-2 max-w-2xl text-sm">
          High-impact decisions for the whole platform. Members, analytics and day-to-day operations live in{" "}
          <Link href="/administration" className="text-[var(--accent)] underline-offset-4 hover:underline">
            Administration
          </Link>
          .
        </p>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {phases.map(({ phase, active, activatedAt }) => {
          const readiness = evaluatePhaseReadiness(phase, process.env);
          const missing = readiness.requirements.filter((requirement) => !requirement.met).length;
          const info = PHASE_EXPLANATIONS[phase];
          return (
            // Each phase is a high-impact entry point: a feature card.
            <FeatureCard key={phase} className="flex flex-col">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="theme-heading text-lg font-semibold">{info.name}</h2>
                {active ? (
                  <Badge tone="good">Active</Badge>
                ) : readiness.ready ? (
                  <Badge tone="accent">Ready to activate</Badge>
                ) : (
                  <Badge tone="warn">Not ready</Badge>
                )}
              </div>
              <p className="theme-meta mt-1 text-sm leading-6">
                {active
                  ? `Activated ${formatDate(activatedAt)}.`
                  : readiness.ready
                    ? "Every requirement is met. Activation needs the CEO password."
                    : `Inactive. ${missing} requirement${missing === 1 ? "" : "s"} still missing, so it can't be activated yet.`}
              </p>
              <p className="theme-body mt-4 border-t border-[var(--border-color)] pt-4 text-sm leading-6">{info.summary}</p>
              <Link href={`/ceo-studio/phases/${phase}`} className="story-button-secondary mt-4 min-h-11 self-start">
                {active ? "View details" : "Open activation"}
              </Link>
            </FeatureCard>
          );
        })}
      </div>
    </div>
  );
}
