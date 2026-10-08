"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlusIcon } from "@/components/icons";
import { createEpisode } from "@/lib/writer-studio/api";

/**
 * Creates a draft episode in `seriesId` and opens it in the editor. The server
 * assigns the next episode number; nothing is created until the click.
 */
export default function NewEpisodeButton({
  seriesId,
  aiUsageTag,
  label = "New episode",
  variant = "primary",
}: {
  seriesId: string;
  aiUsageTag?: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    const result = await createEpisode(seriesId, aiUsageTag);

    if (!result.ok) {
      setError(result.message);
      setPending(false);
      return;
    }

    router.push(`/writer-studio/episodes/${result.data.episode.id}`);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`${variant === "primary" ? "story-button-primary" : "story-button-secondary"} gap-2 disabled:opacity-60`}
      >
        <PlusIcon size={16} />
        {pending ? "Creating…" : label}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-[var(--status-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
