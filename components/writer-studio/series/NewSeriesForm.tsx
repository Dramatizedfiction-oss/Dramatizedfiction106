"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import SeriesFields, { type SeriesFormValues } from "@/components/writer-studio/series/SeriesFields";
import { createSeries } from "@/lib/writer-studio/api";

const EMPTY: SeriesFormValues = {
  title: "",
  genre: "",
  description: "",
  aiUsageTag: "AI FREE",
  coverImage: "",
  themeColor: "",
};

export default function NewSeriesForm() {
  const router = useRouter();
  const [values, setValues] = useState(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = values.title.trim() && values.genre && values.description.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError(null);

    const result = await createSeries({
      title: values.title.trim(),
      genre: values.genre,
      description: values.description.trim(),
      aiUsageTag: values.aiUsageTag,
    });

    if (!result.ok) {
      setError(result.message);
      setPending(false);
      return;
    }

    router.push(`/writer-studio/series/${result.data.series.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SeriesFields values={values} onChange={setValues} basicOnly />
      {error ? (
        <p role="alert" className="text-sm text-[var(--status-danger)]">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={!canSubmit || pending} className="story-button-primary w-full disabled:opacity-50">
        {pending ? "Creating…" : "Create series"}
      </button>
    </form>
  );
}
