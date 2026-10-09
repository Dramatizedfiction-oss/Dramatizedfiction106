"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import ImageUploadField from "@/components/uploads/ImageUploadField";

export default function BecomeAuthorForm({
  defaultDisplayName,
  currentAvatar,
}: {
  defaultDisplayName: string;
  /** What the writer will be shown with if they don't upload: their picture, or the writer default. */
  currentAvatar: string;
}) {
  const router = useRouter();
  const { refreshSession } = useAuthSession();
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [profileImage, setProfileImage] = useState("");
  const [bio, setBio] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/become-author", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        displayName,
        profileImage,
        bio,
        acknowledged,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; redirectTo?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error || "We couldn't unlock writer access.");
      setIsSubmitting(false);
      return;
    }

    await refreshSession();
    router.refresh();
    router.push(payload?.redirectTo || "/writer-studio");
  }

  return (
    <form onSubmit={submit} className="theme-panel rounded-[28px] border border-[var(--border-color)] p-5 md:p-6">
      <p className="eyebrow">Quick Writer Setup</p>
      <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">
        Set your creator identity
      </h2>
      <p className="theme-meta mt-3 text-sm leading-6">
        Keep it light for now. You can polish your profile, WIP systems, monetization, and creator marketing later.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="theme-meta mb-2 block text-xs uppercase tracking-[0.24em]">
            Display Name
          </span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={80}
            required
            className="ui-input w-full rounded-[18px] px-4 py-3 text-sm"
          />
        </label>

        <label className="flex items-start gap-3 rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-1"
            required
          />
          <span className="theme-meta leading-6">
            I agree to publish responsibly and follow the platform&apos;s writer guidelines.
          </span>
        </label>

        <ImageUploadField
          label="Profile picture (optional)"
          purpose="profile-image"
          shape="avatar"
          value={profileImage}
          onChange={setProfileImage}
          fallbackSrc={currentAvatar}
          hint="A square photo works best. JPEG, PNG or WebP. Leave it to keep the picture shown."
        />

        <label className="block">
          <span className="theme-meta mb-2 block text-xs uppercase tracking-[0.24em]">
            Short Bio
          </span>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={4}
            maxLength={280}
            placeholder="Optional"
            className="ui-input w-full rounded-[18px] px-4 py-3 text-sm"
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="ui-alert-error mt-4 rounded-[18px] px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isSubmitting || !acknowledged}
          className="story-button-primary justify-center disabled:opacity-60"
        >
          {isSubmitting ? "Entering creator mode..." : "Become a Writer"}
        </button>
        <Link href="/explore" className="story-button-secondary justify-center">
          Keep Reading
        </Link>
      </div>
    </form>
  );
}
