"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import ImageUploadField from "@/components/uploads/ImageUploadField";
import { PROFILE_LIMITS, PROFILE_LINK_FIELDS, normalizeProfileLink, type ProfileLinkKey } from "@/lib/profile";

type TextFields = { name: string; bio: string } & Record<ProfileLinkKey, string>;

export type ProfileSettingsInitial = TextFields & {
  userId: string;
  image: string;
  bannerImage: string;
};

type Status = { kind: "idle" | "saving" | "saved" | "error"; message?: string };

/*
 * The signed-in user's own profile. Pictures save on upload through
 * /api/me/profile-images; text fields save with the button through
 * /api/me/profile. Both routes only ever change the session user. Bio, banner
 * and links only appear for writers, since only writers have a public page
 * that shows them.
 */
export default function ProfileSettings({
  initial,
  isWriter,
  defaultAvatar,
}: {
  initial: ProfileSettingsInitial;
  isWriter: boolean;
  defaultAvatar: string;
}) {
  const router = useRouter();
  const { refreshSession } = useAuthSession();
  const [images, setImages] = useState({ image: initial.image, bannerImage: initial.bannerImage });
  const [imageStatus, setImageStatus] = useState<Status>({ kind: "idle" });
  const [saved, setSaved] = useState<TextFields>(pickText(initial));
  const [fields, setFields] = useState<TextFields>(pickText(initial));
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const editableKeys: (keyof TextFields)[] = isWriter
    ? ["name", "bio", ...PROFILE_LINK_FIELDS.map((field) => field.key)]
    : ["name"];
  const dirty = editableKeys.some((key) => fields[key] !== saved[key]);

  async function saveImage(field: "image" | "bannerImage", url: string) {
    const previous = images[field];
    setImages((current) => ({ ...current, [field]: url }));
    setImageStatus({ kind: "saving" });

    const response = await fetch("/api/me/profile-images", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: url || null }),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as { error?: string } | null;

    if (!response?.ok) {
      setImages((current) => ({ ...current, [field]: previous }));
      setImageStatus({ kind: "error", message: payload?.error || "Couldn't save that picture. Please try again." });
      return;
    }

    setImageStatus({ kind: "saved", message: field === "image" && !url ? "Using the default picture." : "Saved." });
    if (field === "image") void refreshSession();
    router.refresh();
  }

  async function saveText(event: FormEvent) {
    event.preventDefault();
    const name = fields.name.trim();
    if (!name) {
      setStatus({ kind: "error", message: "Please enter a display name." });
      return;
    }

    const body: Record<string, string> = { name };
    if (isWriter) {
      body.bio = fields.bio;
      for (const field of PROFILE_LINK_FIELDS) {
        const link = normalizeProfileLink(fields[field.key]);
        if (!link.ok) {
          setStatus({ kind: "error", message: `${field.label}: ${link.message}` });
          return;
        }
        body[field.key] = fields[field.key];
      }
    }

    setStatus({ kind: "saving" });
    const response = await fetch("/api/me/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as
      | { error?: string; profile?: Partial<Record<keyof TextFields, string | null>> }
      | null;

    if (!response?.ok || !payload?.profile) {
      setStatus({ kind: "error", message: payload?.error || "Couldn't save your profile. Please try again." });
      return;
    }

    // Show what the server stored (e.g. links normalized to https://).
    const next = { ...fields };
    for (const key of editableKeys) next[key] = payload.profile[key] ?? "";
    setFields(next);
    setSaved(next);
    setStatus({ kind: "saved", message: "Profile saved." });
    void refreshSession();
    router.refresh();
  }

  function update(key: keyof TextFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    if (status.kind !== "saving") setStatus({ kind: "idle" });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <ImageUploadField
          label="Profile picture"
          purpose="profile-image"
          shape="avatar"
          value={images.image}
          fallbackSrc={defaultAvatar}
          onChange={(url) => void saveImage("image", url)}
          hint="A square photo works best. Changes save right away."
        />
        {isWriter ? (
          <ImageUploadField
            label="Profile banner"
            purpose="profile-banner"
            shape="banner"
            value={images.bannerImage}
            onChange={(url) => void saveImage("bannerImage", url)}
            hint="Shown across the top of your public page. A wide image (about 3:1) works best."
          />
        ) : null}
        <StatusLine status={imageStatus} />
      </div>

      <form onSubmit={saveText} className="space-y-5 border-t border-[var(--border-color)] pt-6" noValidate>
        <Field label="Display name" hint={isWriter ? "Shown on your public page and your series." : "Shown on your account."}>
          <input
            value={fields.name}
            onChange={(event) => update("name", event.target.value)}
            maxLength={PROFILE_LIMITS.name}
            autoComplete="nickname"
            required
            className="ui-input w-full px-4 py-3 text-sm"
          />
        </Field>

        {isWriter ? (
          <>
            <Field
              label="Bio"
              hint={`${fields.bio.length}/${PROFILE_LIMITS.bio} · Shown on your public page.`}
            >
              <textarea
                value={fields.bio}
                onChange={(event) => update("bio", event.target.value)}
                maxLength={PROFILE_LIMITS.bio}
                rows={4}
                className="ui-input w-full px-4 py-3 text-sm leading-6"
              />
            </Field>

            <fieldset className="space-y-4">
              <legend className="theme-heading text-sm font-semibold">Links</legend>
              <p className="theme-meta -mt-2 text-xs">Optional. Shown as buttons on your public page.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {PROFILE_LINK_FIELDS.map((field) => (
                  <Field key={field.key} label={field.label}>
                    <input
                      type="url"
                      inputMode="url"
                      value={fields[field.key]}
                      onChange={(event) => update(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      maxLength={PROFILE_LIMITS.link}
                      autoComplete="url"
                      className="ui-input w-full px-4 py-3 text-sm"
                    />
                  </Field>
                ))}
              </div>
            </fieldset>
          </>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!dirty || status.kind === "saving"} className="story-button-primary disabled:opacity-50">
            {status.kind === "saving" ? "Saving…" : "Save profile"}
          </button>
          {isWriter ? (
            <Link href={`/author/${initial.userId}`} className="story-button-secondary">
              View public page
            </Link>
          ) : null}
        </div>
        <StatusLine status={status} />
      </form>
    </div>
  );
}

function pickText(source: TextFields): TextFields {
  const result = { name: source.name, bio: source.bio } as TextFields;
  for (const field of PROFILE_LINK_FIELDS) result[field.key] = source[field.key];
  return result;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="theme-heading mb-2 block text-sm font-semibold">{label}</span>
      {children}
      {hint ? <span className="theme-meta mt-1.5 block text-xs">{hint}</span> : null}
    </label>
  );
}

function StatusLine({ status }: { status: Status }) {
  return (
    <p
      role={status.kind === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`text-sm ${status.kind === "error" ? "text-[var(--status-danger)]" : "text-[var(--text-secondary)]"} ${
        status.kind === "idle" ? "sr-only" : ""
      }`}
    >
      {status.kind === "saving" ? "Saving…" : status.message ?? ""}
    </p>
  );
}
