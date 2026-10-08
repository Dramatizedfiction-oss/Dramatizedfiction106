import Link from "next/link";
import NewSeriesForm from "@/components/writer-studio/series/NewSeriesForm";
import { requireStudioUser } from "@/lib/writer-studio/session";

export default async function NewSeriesPage() {
  await requireStudioUser();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/writer-studio/series" className="theme-meta text-sm transition hover:text-[var(--text-primary)]">
        ← Series
      </Link>
      <h2 className="font-heading theme-heading mt-4 text-3xl font-semibold">New series</h2>
      <p className="theme-meta mt-2 text-sm leading-6">
        Just the essentials for now. You can add a cover and theme color from the series page later.
        The series stays private until you publish its first episode.
      </p>
      <div className="mt-8 rounded-3xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-6">
        <NewSeriesForm />
      </div>
    </div>
  );
}
