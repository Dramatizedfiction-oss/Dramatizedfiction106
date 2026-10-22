"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { StoreIcon } from "@/components/icons";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import ImageUploadField from "@/components/uploads/ImageUploadField";
import UserAvatar from "@/components/UserAvatar";
import Sheet from "@/components/writer-studio/ui/Sheet";
import { PROFILE_LIMITS, PROFILE_LINK_FIELDS, normalizeProfileLink, type ProfileLinkKey } from "@/lib/profile";

/*
 * The profile editor: the one place a member edits their profile (Settings
 * holds app settings only). Opened by the pen button on the member's own
 * reading profile or author page. Everything saves together with "Save":
 *   - text + visibility  -> PATCH /api/me/profile
 *   - banner             -> PATCH /api/me/profile-images
 * The picture has its own place (/reader/avatar, the "Choose avatar" row),
 * which saves on its own. Both routes only ever change the signed-in member.
 * To add a field later, add it to ProfileEditorValues, give it a <Section>,
 * and include it in save().
 */

// The display name is edited on Settings > Account, not here.
export type ProfileEditorValues = {
  bio: string;
  /** The current picture (shown in the "Choose avatar" row; changed at /reader/avatar). */
  image: string;
  bannerImage: string;
  readingProfileVisibility: "PRIVATE" | "PUBLIC";
  activityVisibility: "PRIVATE" | "PUBLIC";
  followerListVisibility: "PRIVATE" | "PUBLIC";
  links: Record<ProfileLinkKey, string>;
};

export default function ProfileEditor({
  initial,
  role,
  isWriter,
}: {
  initial: ProfileEditorValues;
  role: string | null;
  isWriter: boolean;
}) {
  const router = useRouter();
  const { refreshSession } = useAuthSession();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "error"; message?: string }>({ kind: "idle" });

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  function openEditor() {
    setValues(saved);
    setStatus({ kind: "idle" });
    setOpen(true);
  }

  function requestClose() {
    if (status.kind === "saving") return;
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    setOpen(false);
  }

  function set<K extends keyof ProfileEditorValues>(key: K, value: ProfileEditorValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (status.kind === "error") setStatus({ kind: "idle" });
  }

  async function save() {
    const text: Record<string, string> = {};
    if (values.bio !== saved.bio) text.bio = values.bio;
    if (values.readingProfileVisibility !== saved.readingProfileVisibility) {
      text.readingProfileVisibility = values.readingProfileVisibility;
    }
    if (values.activityVisibility !== saved.activityVisibility) {
      text.activityVisibility = values.activityVisibility;
    }
    if (values.followerListVisibility !== saved.followerListVisibility) {
      text.followerListVisibility = values.followerListVisibility;
    }
    if (isWriter) {
      for (const field of PROFILE_LINK_FIELDS) {
        if (values.links[field.key] === saved.links[field.key]) continue;
        const link = normalizeProfileLink(values.links[field.key]);
        if (!link.ok) return setStatus({ kind: "error", message: `${field.label}: ${link.message}` });
        text[field.key] = values.links[field.key];
      }
    }

    const images: Record<string, string | null> = {};
    if (values.bannerImage !== saved.bannerImage) images.bannerImage = values.bannerImage || null;

    setStatus({ kind: "saving" });
    for (const [url, body] of [
      ["/api/me/profile", text],
      ["/api/me/profile-images", images],
    ] as const) {
      if (Object.keys(body).length === 0) continue;
      const response = await fetch(url, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => null);
      if (!response?.ok) {
        const payload = (await response?.json().catch(() => null)) as { error?: string } | null;
        return setStatus({ kind: "error", message: payload?.error || "Couldn't save your profile. Please try again." });
      }
    }

    setSaved(values);
    setStatus({ kind: "idle" });
    setOpen(false);
    void refreshSession();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        aria-label="Edit profile"
        title="Edit profile"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--shadow-card)] transition hover:bg-[var(--panel-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))]"
      >
        <PenIcon />
      </button>

      <Sheet
        open={open}
        title="Edit profile"
        onRequestClose={requestClose}
        footer={
          <div className="flex flex-wrap items-center justify-end gap-3">
            {status.kind === "error" ? (
              <p role="alert" className="mr-auto text-sm text-[var(--status-danger)]">
                {status.message}
              </p>
            ) : null}
            <button type="button" onClick={requestClose} className="story-button-secondary min-h-11">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!dirty || status.kind === "saving"}
              className="story-button-primary min-h-11 disabled:opacity-50"
            >
              {status.kind === "saving" ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        <div className="space-y-8">
          <Section title="Picture">
            <Link
              href="/reader/avatar"
              onClick={(event) => {
                if (dirty && !window.confirm("Leave the editor? Your unsaved changes here will be lost.")) event.preventDefault();
              }}
              className="flex min-h-[72px] items-center gap-4 rounded-2xl border border-[var(--border-color)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--panel-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))]"
            >
              <UserAvatar user={{ image: values.image || null, role }} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="theme-heading block text-sm font-semibold">Choose avatar</span>
                <span className="theme-meta mt-0.5 block text-xs leading-5">Pick one from the library, or upload and position your own photo.</span>
              </span>
              <span aria-hidden className="text-lg text-[var(--text-muted)]">
                ›
              </span>
            </Link>
            <Link
              href="/store"
              onClick={(event) => {
                if (dirty && !window.confirm("Leave the editor? Your unsaved changes here will be lost.")) event.preventDefault();
              }}
              className="mt-2 flex min-h-[72px] items-center gap-4 rounded-2xl border border-[var(--border-color)] p-3 transition hover:border-[var(--border-strong)] hover:bg-[var(--panel-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))]"
            >
              <StoreRowIcon />
              <span className="min-w-0 flex-1">
                <span className="theme-heading block text-sm font-semibold">Store</span>
                <span className="theme-meta mt-0.5 block text-xs leading-5">Browse avatars and choose one for your profile.</span>
              </span>
              <span aria-hidden className="text-lg text-[var(--text-muted)]">
                ›
              </span>
            </Link>
          </Section>

          <ImageUploadField
            label="Background picture"
            purpose="profile-banner"
            shape="banner"
            value={values.bannerImage}
            onChange={(url) => set("bannerImage", url)}
            hint="Shown across the top of your profile. A wide image (about 3:1) works best."
          />

          <Section title="About you" description="Your display name is changed in Settings › Account.">
            <div className="space-y-5">
              <Field label="Bio" hint={`${values.bio.length}/${PROFILE_LIMITS.bio}`}>
                <textarea
                  value={values.bio}
                  onChange={(event) => set("bio", event.target.value)}
                  maxLength={PROFILE_LIMITS.bio}
                  rows={4}
                  className="ui-input w-full px-4 py-3 text-base leading-6 sm:text-sm"
                />
              </Field>
            </div>
          </Section>

          {isWriter ? (
            <Section title="Links" description="Optional. Shown as buttons on your author page.">
              <div className="grid gap-4 sm:grid-cols-2">
                {PROFILE_LINK_FIELDS.map((field) => (
                  <Field key={field.key} label={field.label}>
                    <input
                      type="url"
                      inputMode="url"
                      value={values.links[field.key]}
                      onChange={(event) => set("links", { ...values.links, [field.key]: event.target.value })}
                      placeholder={field.placeholder}
                      maxLength={PROFILE_LIMITS.link}
                      autoComplete="url"
                      className="ui-input w-full px-4 py-3 text-base sm:text-sm"
                    />
                  </Field>
                ))}
              </div>
            </Section>
          ) : null}

          <Section
            title="Reading profile"
            description="Your picture, background picture, name and bio are always visible to anyone with the link to your reading profile."
          >
            <div className="space-y-3">
              <VisibilitySwitch
                name="Followed Series"
                value={values.readingProfileVisibility}
                onChange={(value) => set("readingProfileVisibility", value)}
                publicText="Anyone with the link can see the series you follow."
                privateText="Only you can see the series you follow."
              />
              <VisibilitySwitch
                name="Activity"
                value={values.activityVisibility}
                onChange={(value) => set("activityVisibility", value)}
                publicText="Anyone with the link can see your bookmarks, ratings and comments. Comments always show under their episode."
                privateText="Only you can see your Activity. Your comments still show under their episode."
              />
              <FollowerListSwitch value={values.followerListVisibility} onChange={(value) => set("followerListVisibility", value)} />
              <p className="theme-meta text-xs leading-5">Your Bookmarks and the writers you follow are always private.</p>
            </div>
            {isWriter ? (
              <p className="theme-meta mt-3 text-xs leading-5">Your author page is always public; this only affects your reading profile.</p>
            ) : null}
          </Section>
        </div>
      </Sheet>
    </>
  );
}

export function VisibilitySwitch({
  name,
  value,
  onChange,
  publicText,
  privateText,
}: {
  name: string;
  value: "PRIVATE" | "PUBLIC";
  onChange: (value: "PRIVATE" | "PUBLIC") => void;
  publicText: string;
  privateText: string;
}) {
  const labelId = useId();
  const isPublic = value === "PUBLIC";
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--border-color)] p-4">
      <div className="min-w-0">
        <p id={labelId} className="theme-heading text-sm font-semibold">
          {name}: {isPublic ? "Public" : "Private"}
        </p>
        <p className="theme-meta mt-1 text-xs leading-5">{isPublic ? publicText : privateText}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isPublic}
        aria-label={`Public ${name}`}
        aria-describedby={labelId}
        onClick={() => onChange(isPublic ? "PRIVATE" : "PUBLIC")}
        className="relative flex h-11 w-[60px] shrink-0 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))]"
      >
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 rounded-full transition ${
            isPublic ? "bg-[hsl(var(--series-accent))]" : "bg-[var(--border-strong)]"
          }`}
        />
        <span
          aria-hidden="true"
          className={`relative h-6 w-6 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-[32px]" : "translate-x-[4px]"}`}
        />
      </button>
    </div>
  );
}

/** Whether the member appears by name in the follower lists of writers they follow (Sweep B2). */
export function FollowerListSwitch({ value, onChange }: { value: "PRIVATE" | "PUBLIC"; onChange: (value: "PRIVATE" | "PUBLIC") => void }) {
  return (
    <VisibilitySwitch
      name="Follower lists"
      value={value}
      onChange={onChange}
      publicText="Your picture and name appear in the follower lists of writers you follow."
      privateText="You're left out of writers' follower lists. They still count you as a follower."
    />
  );
}

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="theme-heading text-base font-semibold">{title}</h3>
      {description ? <p className="theme-meta mt-1 text-sm leading-6">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="theme-heading mb-2 block text-sm font-semibold">{label}</span>
      {children}
      {hint ? <span className="theme-meta mt-1.5 block text-xs">{hint}</span> : null}
    </label>
  );
}

/** The Store row's picture in the editors' Picture area, sized like the avatar beside "Choose avatar". */
export function StoreRowIcon() {
  return (
    <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--surface-raised)] text-[var(--text-secondary)]">
      <StoreIcon size={26} />
    </span>
  );
}

export function PenIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 3.5l3 3L7 16H4v-3z" />
      <path d="M11.5 5.5l3 3" />
    </svg>
  );
}
