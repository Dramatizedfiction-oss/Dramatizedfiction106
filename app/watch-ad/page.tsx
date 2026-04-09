"use client";

import { useSearchParams } from "next/navigation";

export default function WatchAdPage() {
  const params = useSearchParams();
  const episodeId = params.get("episode");

  async function finishAd() {
    await fetch("/api/ads/impression", {
      method: "POST",
      body: JSON.stringify({ episodeId })
    });

    window.location.href = `/episode/${episodeId}`;
  }

  return (
    <main className="p-8 max-w-xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Ad Break</h1>

      <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
        <p className="text-slate-400">[Ad Placeholder]</p>
      </div>

      <button
        onClick={finishAd}
        className="w-full bg-blue-600 hover:bg-blue-500 p-3 rounded font-semibold"
      >
        Continue to Episode
      </button>
    </main>
  );
}
