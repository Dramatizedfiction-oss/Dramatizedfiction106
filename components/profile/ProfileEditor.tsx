"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import ImageUploadField from "@/components/uploads/ImageUploadField";
import Sheet from "@/components/writer-studio/ui/Sheet";
import { defaultAvatarFor } from "@/lib/avatars";
import { PROFILE_LIMITS, PROFILE_LINK_FIELDS, normalizeProfileLink, type ProfileLinkKey } from "@/lib/profile";

/*
 * The profile editor: the one place a member edits their profile (Settings
 * holds app settings only). Opened by the pen button on the member's own
 * reading profile or author page. Everything saves together with "Save":
 *   - text + visibility  -> PATCH /api/me/profile
 *   - picture + banner   -> PATCH /api/me/profile-images
 * Both routes only ever change the signed-in member. To add a field later, add
 * it to ProfileEditorValues, give it a <Section>, and include it in save().
 */

export type ProfileEditorValues = {
  name: string;
  bio: string;
  /** Chosen library avatar URL, or "" for the role default. */
  image: string;
  bannerImage: string;
  readingProfileVisibility: "PRIVATE" | "PUBLIC";
  links: Record<ProfileLinkKey, string>;
};

type LibraryAvatar = { id: string; label: string; url: string };

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
  const [library, setLibrary] = useState<LibraryAvatar[] | null>(null);
  const [libraryError, setLibraryError] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "error"; message?: string }>({ kind: "idle" });

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  useEffect(() => {
    if (!open || library) return;
    fetch("/api/avatars/library", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { avatars: LibraryAvatar[] }) => setLibrary(data.avatars))
      .catch(() => setLibraryError(true));
  }, [open, library]);

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
    const name = values.name.trim();
    if (!name) return setStatus({ kind: "error", message: "Please enter a display name." });

    const text: Record<string, string> = {};
    if (name !== saved.name) text.name = name;
    if (values.bio !== saved.bio) text.bio = values.bio;
    if (values.readingProfileVisibility !== saved.readingProfileVisibility) {
      text.readingProfileVisibility = values.readingProfileVisibility;
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
    if (values.image !== saved.image) images.image = values.image || null;
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

    const next = { ...values, name };
    setSaved(next);
    setValues(next);
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
          <Section title="Picture" description="Choose from the Dramatized Fiction avatar library.">
            <AvatarChooser
              value={values.image}
              defaultSrc={defaultAvatarFor(role)}
              initialImage={initial.image}
              library={library}
              libraryError={libraryError}
              onChange={(url) => set("image", url)}
            />
          </Section>

          <ImageUploadField
            label="Background picture"
            purpose="profile-banner"
            shape="banner"
            value={values.bannerImage}
            onChange={(url) => set("bannerImage", url)}
            hint="Shown across the top of your profile. A wide image (about 3:1) works best."
          />

          <Section title="About you">
            <div className="space-y-5">
              <Field label="Display name">
                <input
                  value={values.name}
                  onChange={(event) => set("name", event.target.value)}
                  maxLength={PROFILE_LIMITS.name}
                  autoComplete="nickname"
                  required
                  className="ui-input w-full px-4 py-3 text-base sm:text-sm"
                />
              </Field>
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
            <VisibilitySwitch
              value={values.readingProfileVisibility}
              onChange={(value) => set("readingProfileVisibility", value)}
            />
            {isWriter ? (
              <p className="theme-meta mt-3 text-xs leading-5">Your author page is always public; this only affects your reading profile.</p>
            ) : null}
          </Section>
        </div>
      </Sheet>
    </>
  );
}

function AvatarChooser({
  value,
  defaultSrc,
  initialImage,
  library,
  libraryError,
  onChange,
}: {
  value: string;
  defaultSrc: string;
  initialImage: string;
  library: LibraryAvatar[] | null;
  libraryError: boolean;
  onChange: (url: string) => void;
}) {
  const name = useId();
  // A picture from before the library (a personal upload) can be kept until changed.
  const keepCurrent = initialImage && library && !library.some((avatar) => avatar.url === initialImage);
  const options: { url: string; label: string; src: string }[] = [
    { url: "", label: "Default", src: defaultSrc },
    ...(keepCurrent ? [{ url: initialImage, label: "Current", src: initialImage }] : []),
    ...(library ?? []).map((avatar) => ({ url: avatar.url, label: avatar.label, src: avatar.url })),
  ];
  const current = options.find((option) => option.url === value) ?? options[0];

  return (
    <div>
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.src}
          alt=""
          className="h-20 w-20 shrink-0 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] object-cover"
        />
        <p className="theme-meta text-sm">
          {current.url ? <>Selected: <span className="font-semibold text-[var(--text-primary)]">{current.label}</span></> : "Using the default picture."}
        </p>
      </div>

      {libraryError ? (
        <p role="alert" className="mt-4 text-sm text-[var(--status-danger)]">
          Couldn&apos;t load the avatar library. Close the editor and try again.
        </p>
      ) : library === null ? (
        <p className="theme-meta mt-4 text-sm">Loading avatars…</p>
      ) : (
        <fieldset className="mt-4">
          <legend className="sr-only">Profile picture</legend>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
            {options.map((option) => {
              const checked = option.url === value;
              return (
                <label key={option.url || "default"} className="group flex cursor-pointer flex-col items-center gap-1.5">
                  <input
                    type="radio"
                    name={name}
                    value={option.url}
                    checked={checked}
                    aria-label={option.url ? option.label : "Default picture"}
                    onChange={() => onChange(option.url)}
                    className="peer sr-only"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={option.src}
                    alt=""
                    loading="lazy"
                    className={`h-14 w-14 rounded-full border-2 bg-[var(--surface-raised)] object-cover transition peer-focus-visible:ring-2 peer-focus-visible:ring-[hsl(var(--series-accent))] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--bg-primary)] ${
                      checked ? "border-[hsl(var(--series-accent))]" : "border-transparent group-hover:border-[var(--border-strong)]"
                    }`}
                  />
                  <span className={`w-full truncate text-center text-xs ${checked ? "font-semibold text-[var(--text-primary)]" : "theme-meta"}`}>
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
          {library.length === 0 ? (
            <p className="theme-meta mt-3 text-xs">The library is empty for now, so the default picture is the only choice.</p>
          ) : null}
        </fieldset>
      )}
    </div>
  );
}

function VisibilitySwitch({
  value,
  onChange,
}: {
  value: "PRIVATE" | "PUBLIC";
  onChange: (value: "PRIVATE" | "PUBLIC") => void;
}) {
  const labelId = useId();
  const isPublic = value === "PUBLIC";
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--border-color)] p-4">
      <div className="min-w-0">
        <p id={labelId} className="theme-heading text-sm font-semibold">
          {isPublic ? "Public" : "Private"}
        </p>
        <p className="theme-meta mt-1 text-xs leading-5">
          {isPublic
            ? "Anyone with the link can see your Library and the other sections of your reading profile."
            : "Only you can see your Library and the other sections of your reading profile."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isPublic}
        aria-label="Public reading profile"
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

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="theme-heading text-base font-semibold">{title}</h3>
      {description ? <p className="theme-meta mt-1 text-sm leading-6">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="theme-heading mb-2 block text-sm font-semibold">{label}</span>
      {children}
      {hint ? <span className="theme-meta mt-1.5 block text-xs">{hint}</span> : null}
    </label>
  );
}

function PenIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 3.5l3 3L7 16H4v-3z" />
      <path d="M11.5 5.5l3 3" />
    </svg>
  );
}
