"use client";

import { useState } from "react";

export default function NewSeriesPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [tags, setTags] = useState("");
  const [coverImage, setCoverImage] = useState("");

  async function createSeries() {
    await fetch("/api/series", {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        genre,
        tags: tags.split(",").map((t) => t.trim()),
        coverImage
      })
    });

    window.location.href = "/explore";
  }

  return (
    <main className="p-8 max-w-xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Create New Series</h1>

      <input
        className="w-full p-2 bg-slate-900 border border-slate-700 rounded"
        placeholder="Series Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="w-full p-2 bg-slate-900 border border-slate-700 rounded"
        placeholder="Description"
        rows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        className="w-full p-2 bg-slate-900 border border-slate-700 rounded"
        placeholder="Genre"
        value={genre}
        onChange={(e) => setGenre(e.target.value)}
      />

      <input
        className="w-full p-2 bg-slate-900 border border-slate-700 rounded"
        placeholder="Tags (comma separated)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />

      <input
        className="w-full p-2 bg-slate-900 border border-slate-700 rounded"
        placeholder="Cover Image URL"
        value={coverImage}
        onChange={(e) => setCoverImage(e.target.value)}
      />

      <button
        onClick={createSeries}
        className="w-full bg-blue-600 hover:bg-blue-500 p-3 rounded font-semibold"
      >
        Create Series
      </button>
    </main>
  );
}
