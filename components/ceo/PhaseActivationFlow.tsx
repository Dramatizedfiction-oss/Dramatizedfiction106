"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Badge, Notice, Panel } from "@/components/admin/ui";
import { formatDate } from "@/lib/admin/format";
import type { PHASE_EXPLANATIONS, Requirement } from "@/lib/ceo/phase-readiness";

type Explanation = (typeof PHASE_EXPLANATIONS)[2];
type Step = "confirm" | "explain" | "activating" | "done" | "error";

/*
 * Confirm -> explanation + CEO password -> activating -> done/error.
 * "activating" lasts exactly as long as the real server request; success is
 * shown only after the server confirms the database change committed.
 */
export default function PhaseActivationFlow({
  phase,
  explanation,
  requirements,
  ready,
  active,
  activatedAt,
}: {
  phase: 2 | 3;
  explanation: Explanation;
  requirements: Requirement[];
  ready: boolean;
  active: boolean;
  activatedAt: string | null;
}) {
  const [step, setStep] = useState<Step>(active ? "done" : "confirm");
  const [password, setPassword] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<Requirement[]>([]);
  const [completedAt, setCompletedAt] = useState<string | null>(activatedAt);
  const inFlight = useRef(false);

  async function activate() {
    if (inFlight.current) return; // one request at a time
    inFlight.current = true;
    setError(null);
    setStep("activating");
    const submitted = password;
    setPassword("");

    try {
      const response = await fetch(`/api/ceo/phases/${phase}/activate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ceoPassword: submitted, confirm: true }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; activatedAt?: string; requirements?: Requirement[] }
        | null;
      if (!response.ok) {
        setError(payload?.error || "Activation failed. Nothing was changed.");
        setBlockers(payload?.requirements ?? []);
        setStep("error");
        return;
      }
      setCompletedAt(payload?.activatedAt ?? new Date().toISOString());
      setStep("done");
    } catch {
      setError("The connection was lost before the server answered. Check CEO Studio to see whether the phase is active before trying again.");
      setStep("error");
    } finally {
      inFlight.current = false;
    }
  }

  const back = (
    <Link href="/ceo-studio" className="story-button-secondary">
      Back to CEO Studio
    </Link>
  );

  if (step === "activating") {
    return (
      <div className="phase-activation-stage" role="status" aria-live="polite">
        <div aria-hidden className="phase-activation-fluid">
          <span />
          <span />
          <span />
        </div>
        <p className="font-heading relative text-3xl font-semibold text-white">Configuring {explanation.name}</p>
        <p className="relative mt-3 text-sm text-white/80">Saving the change on the server. Please keep this page open.</p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <Panel title={explanation.name} action={<Badge tone="good">Active</Badge>}>
        <p className="theme-body text-sm leading-6">
          {explanation.name} is active{completedAt ? ` since ${formatDate(completedAt)}` : ""}. The change is saved in the platform
          settings and stays in effect after refreshes and new sessions.
        </p>
        <div className="mt-5">{back}</div>
      </Panel>
    );
  }

  if (step === "confirm") {
    return (
      <Panel title={`Activate ${explanation.name}?`} description="This is a platform-wide change. Next you'll see exactly what it does before anything happens.">
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setStep("explain")} className="story-button-primary">
            Proceed
          </button>
          {back}
        </div>
      </Panel>
    );
  }

  // explain (and error, which returns to the explanation with the message)
  return (
    <div className="space-y-5">
      <Panel title={explanation.name} description={explanation.summary}>
        <Section title="What turns on" items={explanation.activates} />
        <Section title="For readers" items={explanation.readers} />
        <Section title="For writers" items={explanation.writers} />
        <Section title="New responsibilities" items={explanation.operations} />
        <Section title="Systems affected" items={explanation.systems} />
        <div className="mt-5">
          <h3 className="theme-heading text-sm font-semibold">Can it be reversed?</h3>
          <p className="theme-body mt-1 text-sm leading-6">{explanation.reversal}</p>
        </div>
      </Panel>

      <Panel
        title="Requirements"
        description={ready ? "Every requirement is met." : "Activation is blocked until every requirement is met. Nothing has been changed."}
      >
        <ul className="space-y-3">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="flex items-start gap-3 text-sm">
              <Badge tone={requirement.met ? "good" : "warn"}>{requirement.met ? "Met" : "Missing"}</Badge>
              <span>
                <span className="theme-heading font-semibold">{requirement.label}.</span>{" "}
                <span className="theme-meta">{requirement.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      {step === "error" && error ? (
        <Panel>
          <Notice tone="error">{error}</Notice>
          {blockers.length ? (
            <ul className="theme-meta mt-2 list-disc pl-5 text-sm">
              {blockers.map((blocker) => (
                <li key={blocker.id}>{blocker.label}</li>
              ))}
            </ul>
          ) : null}
        </Panel>
      ) : null}

      <Panel title="Authorize activation">
        {ready ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void activate();
            }}
          >
            <label className="block">
              <span className="theme-meta mb-1 block text-xs">CEO password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="ui-input w-full max-w-sm px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} className="mt-1" />
              <span className="theme-body">I've read what this phase changes and want to activate it for the whole platform.</span>
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="submit" disabled={!password || !understood} className="story-button-primary disabled:opacity-50">
                Activate {explanation.name}
              </button>
              {back}
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="theme-meta text-sm">
              The password step opens once every requirement above is met. Until then this phase stays inactive.
            </p>
            {back}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-5 first:mt-0">
      <h3 className="theme-heading text-sm font-semibold">{title}</h3>
      <ul className="theme-body mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
