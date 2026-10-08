"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ImageUploadField from "@/components/uploads/ImageUploadField";
import Sheet from "@/components/writer-studio/ui/Sheet";

/*
 * Lets the signed-in user change their own profile picture and banner from
 * their public profile. Rendered only on your own profile, but the server
 * (PATCH /api/me/profile-images) only ever changes the session user anyway.
 * Each change is saved as soon as the upload (or removal) finishes.
 */
export default function ProfileImagesEditor({
  image,
  bannerImage,
}: {
  image: string | null;
  bannerImage: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ image: image ?? "", bannerImage: bannerImage ?? "" });
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({
    kind: "idle",
  });

  async function save(field: "image" | "bannerImage", url: string) {
    const previous = values[field];
    setValues((current) => ({ ...current, [field]: url }));
    setStatus({ kind: "saving" });

    const response = await fetch("/api/me/profile-images", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: url || null }),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as { error?: string } | null;

    if (!response?.ok) {
      setValues((current) => ({ ...current, [field]: previous }));
      setStatus({ kind: "error", message: payload?.error || "Couldn't save that change. Please try again." });
      return;
    }

    setStatus({ kind: "saved" });
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStatus({ kind: "idle" });
          setOpen(true);
        }}
        className="story-button-secondary px-4 py-2"
      >
        Edit profile images
      </button>
      <Sheet open={open} title="Profile images" onRequestClose={() => setOpen(false)}>
        <div className="space-y-8">
          <ImageUploadField
            label="Profile picture"
            purpose="profile-image"
            shape="avatar"
            value={values.image}
            onChange={(url) => void save("image", url)}
            hint="A square photo works best. Changes save right away."
          />
          <ImageUploadField
            label="Banner"
            purpose="profile-banner"
            shape="banner"
            value={values.bannerImage}
            onChange={(url) => void save("bannerImage", url)}
            hint="A wide image works best (about 3:1). Changes save right away."
          />
          <p
            role={status.kind === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`text-sm ${status.kind === "error" ? "text-[var(--status-danger)]" : "text-[var(--studio-muted)]"}`}
          >
            {status.kind === "saving" ? "Saving…" : status.kind === "saved" ? "Saved." : status.message ?? ""}
          </p>
        </div>
      </Sheet>
    </>
  );
}
