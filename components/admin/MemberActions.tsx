"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice, Panel, ROLE_LABELS } from "@/components/admin/ui";
import { formatRestrictionEnd } from "@/lib/admin/format";
import { MAX_BOARD_MEMBERS, type RoleChange } from "@/lib/admin/policy";

type Viewer = { id: string; role: string };
type Member = { id: string; name: string; role: string; status: "active" | "disciplined" | "banned"; restrictionEndsAt: string | null };

type ModerationStep = null | "DISCIPLINE" | "BAN" | "LIFT";

/*
 * Moderation and role actions for one member. The buttons shown mirror the
 * server rules for clarity only; every request is authorized again on the
 * server (lib/admin/policy.ts), which is authoritative.
 */
export default function MemberActions({
  viewer,
  member,
  boardSeatsUsed,
  ceoCount,
}: {
  viewer: Viewer;
  member: Member;
  boardSeatsUsed: number;
  ceoCount: number;
}) {
  const viewerIsCeo = viewer.role === "CEO";
  const isSelf = viewer.id === member.id;
  const canModerate = !isSelf && member.role !== "CEO" && (member.role !== "BOARD" || viewerIsCeo);

  return (
    <>
      <ModerationPanel member={member} canModerate={canModerate} isSelf={isSelf} />
      {viewerIsCeo ? <RolePanel member={member} isSelf={isSelf} boardSeatsUsed={boardSeatsUsed} ceoCount={ceoCount} /> : null}
    </>
  );
}

function ModerationPanel({ member, canModerate, isSelf }: { member: Member; canModerate: boolean; isSelf: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<ModerationStep>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function submit() {
    if (!step) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/admin/members/${member.id}/moderation`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: step, reason, confirm: true }),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as { error?: string; endsAt?: string | null } | null;
    setBusy(false);

    if (!response?.ok) {
      setMessage({ tone: "error", text: payload?.error || "That didn't work. Nothing was changed." });
      return;
    }
    setMessage({
      tone: "success",
      text:
        step === "BAN"
          ? `${member.name} is now banned until an administrator lifts it.`
          : step === "DISCIPLINE"
            ? `${member.name} is restricted until ${formatRestrictionEnd(payload?.endsAt ?? null)}.`
            : "The restriction was lifted. Their normal access is back.",
    });
    setStep(null);
    setReason("");
    router.refresh();
  }

  const restricted = member.status !== "active";

  return (
    <Panel
      title="Moderation"
      description={
        canModerate
          ? "Restrictions are enforced on the server across the whole platform. Neither changes the member's role or writer status."
          : isSelf
            ? "You can't moderate your own account."
            : member.role === "CEO"
              ? "CEO accounts can't be moderated."
              : "Only the CEO can moderate Board members."
      }
    >
      {canModerate ? (
        <div className="space-y-4">
          {step === null ? (
            <div className="flex flex-wrap gap-3">
              {restricted ? (
                <button type="button" onClick={() => setStep("LIFT")} className="story-button-secondary">
                  {member.status === "banned" ? "Lift ban" : "End discipline early"}
                </button>
              ) : null}
              {member.status === "active" ? (
                <button type="button" onClick={() => setStep("DISCIPLINE")} className="story-button-secondary">
                  Discipline for one month
                </button>
              ) : null}
              {member.status !== "banned" ? (
                <button
                  type="button"
                  onClick={() => setStep("BAN")}
                  className="story-button-secondary border-[var(--status-danger)] text-[var(--status-danger)]"
                >
                  Permanent ban
                </button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border-strong)] p-4">
              <p className="theme-heading text-sm font-semibold">
                {step === "BAN"
                  ? `Permanently ban ${member.name}?`
                  : step === "DISCIPLINE"
                    ? `Restrict ${member.name} for one month?`
                    : "Lift this restriction?"}
              </p>
              <p className="theme-meta mt-1 text-sm leading-6">
                {step === "BAN"
                  ? "They will only see a suspension notice until an administrator lifts the ban. There is no automatic end date."
                  : step === "DISCIPLINE"
                    ? "For one month they can read but can't post, publish, edit their profile or use Writer Studio. Access returns automatically when it ends."
                    : "Their normal access returns immediately."}
              </p>
              <label className="mt-3 block">
                <span className="theme-meta mb-1 block text-xs">
                  {step === "LIFT" ? "Note (optional, private)" : "Reason (required, private to Administration)"}
                </span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  className="ui-input w-full px-3 py-2 text-sm"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={busy || (step !== "LIFT" && reason.trim().length < 3)}
                  className="story-button-primary disabled:opacity-50"
                >
                  {busy ? "Saving…" : step === "BAN" ? "Confirm ban" : step === "DISCIPLINE" ? "Confirm restriction" : "Confirm"}
                </button>
                <button type="button" onClick={() => setStep(null)} disabled={busy} className="story-button-secondary">
                  Cancel
                </button>
              </div>
            </div>
          )}
          {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
        </div>
      ) : null}
    </Panel>
  );
}

const CHANGE_COPY: Record<RoleChange, { label: string; confirm: (name: string) => string }> = {
  MAKE_BOARD: { label: "Add to the Board", confirm: (name) => `Add ${name} to the Board?` },
  REMOVE_BOARD: { label: "Remove from the Board", confirm: (name) => `Remove ${name}'s Board privileges?` },
  MAKE_CEO: { label: "Make CEO", confirm: (name) => `Give ${name} CEO privileges, including CEO Studio and phase activation?` },
  REMOVE_CEO: { label: "Remove CEO privileges", confirm: (name) => `Remove ${name}'s CEO privileges?` },
};

function RolePanel({
  member,
  isSelf,
  boardSeatsUsed,
  ceoCount,
}: {
  member: Member;
  isSelf: boolean;
  boardSeatsUsed: number;
  ceoCount: number;
}) {
  const router = useRouter();
  const [change, setChange] = useState<RoleChange | null>(null);
  const [password, setPassword] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const options: { change: RoleChange; disabled?: string }[] =
    member.role === "CEO"
      ? [{ change: "REMOVE_CEO", disabled: ceoCount <= 1 ? "The platform must always have at least one CEO." : undefined }]
      : member.role === "BOARD"
        ? [{ change: "REMOVE_BOARD" }, { change: "MAKE_CEO" }]
        : [
            { change: "MAKE_BOARD", disabled: boardSeatsUsed >= MAX_BOARD_MEMBERS ? `The Board is full (${MAX_BOARD_MEMBERS} seats).` : undefined },
            { change: "MAKE_CEO" },
          ];

  async function submit() {
    if (!change) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/admin/members/${member.id}/role`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ change, ceoPassword: password, confirm: true }),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as { error?: string; to?: string } | null;
    setBusy(false);
    setPassword("");

    if (!response?.ok) {
      setMessage({ tone: "error", text: payload?.error || "That didn't work. Nothing was changed." });
      return;
    }
    setMessage({ tone: "success", text: `Done. ${member.name} is now ${ROLE_LABELS[payload?.to ?? ""] ?? payload?.to}.` });
    setChange(null);
    setUnderstood(false);
    router.refresh();
  }

  return (
    <Panel
      title="Board and CEO roles"
      description={`CEO only. Every change needs the CEO password. Board seats used: ${boardSeatsUsed}/${MAX_BOARD_MEMBERS}.`}
    >
      {change === null ? (
        <div className="flex flex-wrap gap-3">
          {options.map((option) => (
            <div key={option.change}>
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  setChange(option.change);
                }}
                disabled={Boolean(option.disabled)}
                className="story-button-secondary disabled:opacity-50"
              >
                {CHANGE_COPY[option.change].label}
              </button>
              {option.disabled ? <p className="theme-meta mt-1 text-xs">{option.disabled}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <form
          className="rounded-2xl border border-[var(--border-strong)] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <p className="theme-heading text-sm font-semibold">{CHANGE_COPY[change].confirm(member.name)}</p>
          {isSelf && change === "REMOVE_CEO" ? (
            <p className="mt-1 text-sm text-[var(--status-warning)]">This removes your own CEO access, including CEO Studio.</p>
          ) : null}
          <label className="mt-3 block">
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
            <span className="theme-body">I understand this changes what {member.name} can access.</span>
          </label>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="submit" disabled={busy || !password || !understood} className="story-button-primary disabled:opacity-50">
              {busy ? "Saving…" : "Confirm change"}
            </button>
            <button
              type="button"
              onClick={() => {
                setChange(null);
                setPassword("");
                setUnderstood(false);
              }}
              disabled={busy}
              className="story-button-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {message ? (
        <div className="mt-3">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      ) : null}
    </Panel>
  );
}
