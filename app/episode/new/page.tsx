"use client";

import { useState } from "react";

export default function NewEpisodePage() {
  const [seriesId, setSeriesId] = useState("");
  const [title, setTitle] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState(1);
  const [bodyText, setBodyText] = useState("");
  const [teaser, setTeaser] = useState("");
  const [readTime, setReadTime] = useState(5);

  async function createEpisode() {
    await fetch("/api/episodes", {
      method: "POST",
      body: JSON.stringify({
        seriesId,
        title,
        episodeNumber,
        bodyText,
        teaser,
        readTime
      })
    });

    window.location.href = `/series/${seriesId}`;
  }

  return (
    <main className="p-8 max-w-xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Create New Episode</h1>

      <input
        className="w-full p-2 bg-slate-900 border border-slate-700 rounded"
        placeholder="Series ID"
        value={seriesId}
        onChange={(e) => setSeriesId(e.target.value)}
      />

      <input
        className="w-full p-2 bg-slate-900 border border-slate-700 rounded"
        placeholder="Episode Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <input
        type="number"
        className="w-full p-2 bg-slate-900 border border-slate-700 rounded"
        placeholder="Episode Number"
        value={episodeNumber}
        onChange={(e) => setEpisodeNumber(Number(e.target.value))}
      />

      <textarea
        className="w-full p-2 bg-slate-900 border border-slate-700 rounded"
        placeholder="Episode Body"
        rows={10}
        value={bodyText}
        onChange={(e) => setBodyText(e.target.value)}
      />

      <textarea
        className="w-full p-2 bg-slate-900 border border-slate-700 rounded"
        placeholder="Teaser (optional)"
        rows={3}
        value={teaser}
        onChange={(e) => setTeaser(e.target.value)}
      />

      <input
        type="number"
        className="w-full p-2 bg-slate-900 border border-slate-700 rounded"
        placeholder="Read Time (minutes)"
        value={readTime}
        onChange={(e) => setReadTime(Number(e.target.value))}
      />

      <button
        onClick={createEpisode}
        className="w-full bg-blue-600 hover:bg-blue-500 p-3 rounded font-semibold"
      >
        Publish Episode
      </button>
    </main>
  );
}
