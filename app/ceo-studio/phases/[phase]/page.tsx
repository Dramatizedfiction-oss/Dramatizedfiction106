import { notFound } from "next/navigation";
import { auth } from "@/auth";
import PhaseActivationFlow from "@/components/ceo/PhaseActivationFlow";
import { PHASE_EXPLANATIONS, evaluatePhaseReadiness, parsePhase } from "@/lib/ceo/phase-readiness";
import { getPlatformSettings } from "@/lib/phases";
import { requireCEOPage } from "@/lib/utils";

export default async function PhasePage({ params }: { params: { phase: string } }) {
  requireCEOPage(await auth(), `/ceo-studio/phases/${params.phase}`);
  const phase = parsePhase(params.phase);
  if (!phase) notFound();

  const settings = await getPlatformSettings();
  const active =
    phase === 2 ? settings.phaseTwoUnlocked && settings.enablePayments : settings.phaseThreeUnlocked && settings.enableAds;
  const activatedAt = phase === 2 ? settings.phaseTwoActivatedAt : settings.phaseThreeActivatedAt;
  // Evaluated on the server: only met/unmet results reach the browser, never env values.
  const readiness = evaluatePhaseReadiness(phase, process.env);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-6 md:px-8 md:pt-8">
      <PhaseActivationFlow
        phase={phase}
        explanation={PHASE_EXPLANATIONS[phase]}
        requirements={readiness.requirements}
        ready={readiness.ready}
        active={active}
        activatedAt={activatedAt ? activatedAt.toISOString() : null}
      />
    </div>
  );
}
