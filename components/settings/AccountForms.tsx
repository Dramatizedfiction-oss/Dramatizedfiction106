"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import { DISPLAY_NAME_MAX, DISPLAY_NAME_MIN, PASSWORD_MIN, normalizeDisplayName } from "@/lib/account-rules";

/* Settings > Account forms. Each one only changes the signed-in member (the server decides who). */

type Status = { kind: "idle" | "saving" | "saved" | "error"; message?: string };

async function send(url: string, method: string, body: unknown) {
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  const data = (await response?.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: Boolean(response?.ok), status: response?.status ?? 0, data };
}

export function DisplayNameForm({ initial }: { initial: string }) {
  const router = useRouter();
  const { refreshSession } = useAuthSession();
  const id = useId();
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const normalized = normalizeDisplayName(value);
  const dirty = value.trim() !== saved;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!normalized) {
      return setStatus({ kind: "error", message: `Use ${DISPLAY_NAME_MIN}–${DISPLAY_NAME_MAX} characters.` });
    }
    setStatus({ kind: "saving" });
    const result = await send("/api/me/account/name", "PATCH", { name: value });
    if (!result.ok) {
      return setStatus({ kind: "error", message: (result.data?.error as string) || "Couldn't save. Please try again." });
    }
    const name = (result.data?.name as string) ?? normalized;
    setSaved(name);
    setValue(name);
    setStatus({ kind: "saved", message: "Display name saved." });
    void refreshSession();
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate>
      {/* The section heading already says "Display name"; keep the label for screen readers. */}
      <label htmlFor={id} className="sr-only">
        Display name
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={id}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (status.kind !== "saving") setStatus({ kind: "idle" });
          }}
          maxLength={DISPLAY_NAME_MAX + 10}
          autoComplete="nickname"
          aria-describedby={`${id}-hint`}
          className="ui-input min-h-11 w-full min-w-0 flex-1 px-4 text-base sm:text-sm"
        />
        <button type="submit" disabled={!dirty || status.kind === "saving"} className="story-button-primary min-h-11 disabled:opacity-50">
          {status.kind === "saving" ? "Saving…" : "Save"}
        </button>
      </div>
      <p id={`${id}-hint`} className="theme-meta mt-1.5 text-xs">
        Shown on your profile, your stories and anywhere you appear. {DISPLAY_NAME_MIN}–{DISPLAY_NAME_MAX} characters.
      </p>
      <StatusLine status={status} />
    </form>
  );
}

export function AgeConfirmation({ confirmedAt }: { confirmedAt: string | null }) {
  const id = useId();
  const [confirmed, setConfirmed] = useState(confirmedAt);
  const [parts, setParts] = useState({ day: "", month: "", year: "" });
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  if (confirmed) {
    return (
      <p className="flex items-center gap-2 text-sm">
        <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[hsl(var(--series-accent))]">
          ✓
        </span>
        <span className="theme-heading font-semibold">
          Confirmed on {new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(new Date(confirmed))}
        </span>
      </p>
    );
  }

  const complete = parts.day.length > 0 && parts.month.length > 0 && parts.year.length === 4;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus({ kind: "saving" });
    const result = await send("/api/me/account/age", "POST", parts);
    if (result.ok) {
      setConfirmed((result.data?.confirmedAt as string) ?? new Date().toISOString());
      return;
    }
    // Neutral wording for under-age, as for any other refusal.
    setStatus({ kind: "error", message: (result.data?.error as string) || "We couldn't confirm this. Please try again." });
    if (result.status === 422) setParts({ day: "", month: "", year: "" });
  }

  const field = (key: keyof typeof parts, label: string, placeholder: string, max: number) => (
    <label className="block min-w-0">
      <span className="theme-meta mb-1 block text-xs font-semibold uppercase tracking-[0.14em]">{label}</span>
      <input
        value={parts[key]}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, max);
          setParts((current) => ({ ...current, [key]: digits }));
          if (status.kind === "error") setStatus({ kind: "idle" });
        }}
        inputMode="numeric"
        autoComplete="off"
        aria-label={`${label} of birth`}
        placeholder={placeholder}
        className="ui-input min-h-11 w-full px-3 text-center text-base tabular-nums sm:text-sm"
      />
    </label>
  );

  return (
    <form onSubmit={submit} noValidate aria-describedby={`${id}-note`}>
      <fieldset>
        <legend className="theme-heading text-sm font-semibold">Your date of birth</legend>
        <div className="mt-2 grid grid-cols-[1fr_1fr_1.4fr] gap-3 sm:max-w-sm">
          {field("day", "Day", "DD", 2)}
          {field("month", "Month", "MM", 2)}
          {field("year", "Year", "YYYY", 4)}
        </div>
      </fieldset>
      <p id={`${id}-note`} className="theme-meta mt-2 text-xs leading-5">
        We only keep the fact that you confirmed, never your date of birth.
      </p>
      <button type="submit" disabled={!complete || status.kind === "saving"} className="story-button-primary mt-4 min-h-11 disabled:opacity-50">
        {status.kind === "saving" ? "Checking…" : "Confirm"}
      </button>
      <StatusLine status={status} />
    </form>
  );
}

export function ChangePasswordForm() {
  const [fields, setFields] = useState({ current: "", next: "", confirm: "" });
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const mismatch = fields.confirm.length > 0 && fields.next !== fields.confirm;
  const ready = fields.current.length > 0 && fields.next.length >= PASSWORD_MIN && fields.next === fields.confirm;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setStatus({ kind: "saving" });
    const result = await send("/api/me/account/password", "POST", { currentPassword: fields.current, newPassword: fields.next });
    if (!result.ok) {
      return setStatus({ kind: "error", message: (result.data?.error as string) || "Couldn't change your password. Please try again." });
    }
    setFields({ current: "", next: "", confirm: "" });
    setStatus({ kind: "saved", message: "Password changed. You've been signed out on your other devices." });
  }

  const update = (key: keyof typeof fields) => (value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    if (status.kind !== "saving") setStatus({ kind: "idle" });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4 sm:max-w-sm">
      <PasswordField label="Current password" value={fields.current} onChange={update("current")} autoComplete="current-password" />
      <PasswordField
        label="New password"
        value={fields.next}
        onChange={update("next")}
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN} characters.`}
      />
      <PasswordField
        label="Confirm new password"
        value={fields.confirm}
        onChange={update("confirm")}
        autoComplete="new-password"
        hint={mismatch ? <span className="text-[var(--status-danger)]">The passwords don&apos;t match.</span> : undefined}
      />
      <button type="submit" disabled={!ready || status.kind === "saving"} className="story-button-primary min-h-11 disabled:opacity-50">
        {status.kind === "saving" ? "Changing…" : "Change password"}
      </button>
      <StatusLine status={status} />
    </form>
  );
}

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="theme-heading mb-2 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="ui-input min-h-11 w-full px-4 text-base sm:text-sm"
      />
      {hint ? (
        <p id={`${id}-hint`} className="theme-meta mt-1.5 text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function StatusLine({ status }: { status: Status }) {
  return (
    <p
      role={status.kind === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`mt-2 text-sm ${status.kind === "error" ? "text-[var(--status-danger)]" : "text-[var(--text-secondary)]"} ${
        status.kind === "idle" || status.kind === "saving" ? "sr-only" : ""
      }`}
    >
      {status.message ?? ""}
    </p>
  );
}
