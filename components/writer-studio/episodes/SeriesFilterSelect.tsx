"use client";

import { useRouter } from "next/navigation";

export default function SeriesFilterSelect({
  options,
  value,
  status,
}: {
  options: { id: string; title: string }[];
  value: string | null;
  status: string;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--studio-muted)]">
      <span className="sr-only">Filter by series</span>
      <select
        className="studio-field px-3 py-2 text-sm"
        value={value ?? ""}
        onChange={(event) => {
          const search = new URLSearchParams();
          if (status !== "all") search.set("status", status);
          if (event.target.value) search.set("series", event.target.value);
          const query = search.toString();
          router.push(`/writer-studio/episodes${query ? `?${query}` : ""}`);
        }}
      >
        <option value="">All series</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.title}
          </option>
        ))}
      </select>
    </label>
  );
}
