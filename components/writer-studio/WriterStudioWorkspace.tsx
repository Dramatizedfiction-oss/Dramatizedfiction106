"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SeriesEpisode = {
  id: string;
  title: string;
  episodeNumber: number;
  description: string | null;
  contentWarning: string | null;
  body: string;
  coverImage: string | null;
  status: "DRAFT" | "REVIEW" | "PUBLISHED";
  locked: boolean;
  aiUsageTag: string;
  lastSavedAt: string;
};

type SeriesItem = {
  id: string;
  title: string;
  description: string;
  genre: string;
  coverImage: string | null;
  themeColor: string | null;
  status: "DRAFT" | "PUBLISHED";
  updatedAt: string;
  episodes: SeriesEpisode[];
};

type WriterStudioWorkspaceProps = {
  userId: string;
  userName: string | null;
  series: SeriesItem[];
  selectedSeriesId?: string | null;
  selectedEpisodeId?: string | null;
};

export default function WriterStudioWorkspace({
  userId: _userId,
  userName,
  series,
  selectedSeriesId,
  selectedEpisodeId,
}: WriterStudioWorkspaceProps) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const bodySaveTimer = useRef<number | null>(null);
  const seriesSaveTimer = useRef<number | null>(null);
  const [seriesList, setSeriesList] = useState(series);
  const [activeSeriesId, setActiveSeriesId] = useState<string | null>(
    selectedSeriesId || series[0]?.id || null,
  );
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(
    selectedEpisodeId || null,
  );
  const [showTools, setShowTools] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [seriesDraft, setSeriesDraft] = useState({
    title: "",
    description: "",
    genre: "",
    coverImage: "",
    themeColor: "",
  });
  const [episodeDraft, setEpisodeDraft] = useState({
    title: "",
    episodeNumber: 1,
    description: "",
    contentWarning: "",
    coverImage: "",
    aiUsageTag: "AI FREE",
    locked: false,
  });
  const [bodyHtml, setBodyHtml] = useState("");
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Draft not loaded">(
    "Draft not loaded",
  );
  const [seriesSaveStatus, setSeriesSaveStatus] = useState<"Saved" | "Saving..." | "Draft not loaded">(
    "Draft not loaded",
  );

  useEffect(() => {
    setSeriesList(series);
  }, [series]);

  const activeSeries = useMemo(
    () => seriesList.find((item) => item.id === activeSeriesId) || null,
    [seriesList, activeSeriesId],
  );

  const activeEpisode = useMemo(
    () => activeSeries?.episodes.find((item) => item.id === activeEpisodeId) || null,
    [activeSeries, activeEpisodeId],
  );

  const publishTarget = activeEpisode?.id ? `/writer-studio/publish/${activeEpisode.id}` : null;

  useEffect(() => {
    const nextSeries = seriesList.find((item) => item.id === activeSeriesId) || null;
    if (!nextSeries) {
      setSeriesDraft({
        title: "",
        description: "",
        genre: "",
        coverImage: "",
        themeColor: "",
      });
      setSeriesSaveStatus("Draft not loaded");
      return;
    }

    setSeriesDraft({
      title: nextSeries.title || "",
      description: nextSeries.description || "",
      genre: nextSeries.genre || "",
      coverImage: nextSeries.coverImage || "",
      themeColor: nextSeries.themeColor || "",
    });
    setSeriesSaveStatus("Saved");
  }, [activeSeriesId, seriesList]);

  useEffect(() => {
    const nextEpisode = activeSeries?.episodes.find((item) => item.id === activeEpisodeId) || null;
    if (!nextEpisode) {
      setEpisodeDraft({
        title: "",
        episodeNumber: 1,
        description: "",
        contentWarning: "",
        coverImage: "",
        aiUsageTag: "AI FREE",
        locked: false,
      });
      setBodyHtml("");
      setSaveStatus("Draft not loaded");
      return;
    }

    setEpisodeDraft({
      title: nextEpisode.title || "",
      episodeNumber: nextEpisode.episodeNumber || 1,
      description: nextEpisode.description || "",
      contentWarning: nextEpisode.contentWarning || "",
      coverImage: nextEpisode.coverImage || "",
      aiUsageTag: nextEpisode.aiUsageTag || "AI FREE",
      locked: nextEpisode.locked || false,
    });

    const storageKey = `writer-draft-${nextEpisode.id}`;
    const storedDraft =
      typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    setBodyHtml(storedDraft || nextEpisode.body || "");
    setSaveStatus("Saved");
  }, [activeEpisodeId, activeSeries?.episodes]);

  const sortedEpisodes = useMemo(() => {
    return [...(activeSeries?.episodes || [])].sort((a, b) => a.episodeNumber - b.episodeNumber);
  }, [activeSeries]);

  function selectSeries(id: string) {
    const nextSeries = seriesList.find((item) => item.id === id) || null;
    setActiveSeriesId(id);
    setActiveEpisodeId(nextSeries?.episodes[0]?.id || null);
    router.replace(
      `/writer-studio?series=${id}${nextSeries?.episodes[0]?.id ? `&episode=${nextSeries.episodes[0].id}` : ""}`,
    );
  }

  function selectEpisode(id: string) {
    setActiveEpisodeId(id);
    router.replace(`/writer-studio?series=${activeSeriesId || ""}&episode=${id}`);
  }

  async function createSeries() {
    const response = await fetch("/api/writer-studio/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(seriesDraft),
    });

    const payload = await response.json();
    if (!response.ok) {
      alert(payload?.error || "Could not create series.");
      return;
    }

    const created = payload.series as SeriesItem;
    setSeriesList((current) => [created, ...current]);
    setActiveSeriesId(created.id);
    setActiveEpisodeId(created.episodes?.[0]?.id || null);
    router.replace(`/writer-studio?series=${created.id}`);
    router.refresh();
  }

  async function createEpisode() {
    if (!activeSeries) return;

    const response = await fetch("/api/writer-studio/episodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        seriesId: activeSeries.id,
        title: episodeDraft.title || "Untitled Episode",
        episodeNumber: episodeDraft.episodeNumber,
        description: episodeDraft.description,
        contentWarning: episodeDraft.contentWarning,
        body: bodyHtml || "<p>Start writing your episode here.</p>",
        coverImage: episodeDraft.coverImage,
        aiUsageTag: episodeDraft.aiUsageTag,
        readTime: 5,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      alert(payload?.error || "Could not create episode.");
      return;
    }

    const created = payload.episode as SeriesEpisode;
    setSeriesList((current) =>
      current.map((item) =>
        item.id === activeSeries.id ? { ...item, episodes: [...item.episodes, created] } : item,
      ),
    );
    setActiveEpisodeId(created.id);
    router.replace(`/writer-studio?series=${activeSeries.id}&episode=${created.id}`);
    router.refresh();
  }

  function scheduleSeriesSave(nextDraft = seriesDraft) {
    if (!activeSeries) return;
    if (seriesSaveTimer.current) window.clearTimeout(seriesSaveTimer.current);
    setSeriesSaveStatus("Saving...");

    seriesSaveTimer.current = window.setTimeout(async () => {
      const response = await fetch(`/api/writer-studio/series/${activeSeries.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...nextDraft,
          status: activeSeries.status,
        }),
      });

      if (!response.ok) {
        setSeriesSaveStatus("Draft not loaded");
        return;
      }

      const payload = await response.json();
      const updated = payload.series as SeriesItem;
      setSeriesList((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      setSeriesSaveStatus("Saved");
    }, 650);
  }

  function scheduleEpisodeSave(nextBody = bodyHtml, nextDraft = episodeDraft) {
    if (!activeEpisode || !activeSeries) return;

    if (bodySaveTimer.current) window.clearTimeout(bodySaveTimer.current);
    setSaveStatus("Saving...");

    window.localStorage.setItem(`writer-draft-${activeEpisode.id}`, nextBody);
    bodySaveTimer.current = window.setTimeout(async () => {
      const response = await fetch(`/api/writer-studio/episodes/${activeEpisode.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: nextDraft.title,
          episodeNumber: nextDraft.episodeNumber,
          description: nextDraft.description,
          contentWarning: nextDraft.contentWarning,
          body: nextBody,
          coverImage: nextDraft.coverImage,
          aiUsageTag: nextDraft.aiUsageTag,
          readTime: Math.max(
            3,
            Math.round(nextBody.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length / 180) + 1,
          ),
          status: "DRAFT",
          locked: nextDraft.locked,
        }),
      });

      if (!response.ok) {
        setSaveStatus("Draft not loaded");
        return;
      }

      const payload = await response.json();
      const updated = payload.episode as SeriesEpisode;
      setSeriesList((current) =>
        current.map((item) =>
          item.id === activeSeries.id
            ? {
                ...item,
                episodes: item.episodes.map((episode) =>
                  episode.id === updated.id ? { ...episode, ...updated } : episode,
                ),
              }
            : item,
        ),
      );
      setSaveStatus("Saved");
    }, 700);
  }

  function insertSceneBreak() {
    if (!editorRef.current) return;
    const divider =
      '<div data-scene-break="true" class="my-10 select-none text-center text-sm tracking-[0.35em] text-[var(--text-secondary)]">──────── ✦ ────────</div><p><br /></p>';
    editorRef.current.focus();
    document.execCommand("insertHTML", false, divider);
    const nextHtml = editorRef.current.innerHTML;
    setBodyHtml(nextHtml);
    scheduleEpisodeSave(nextHtml, episodeDraft);
  }

  function formatSelection(command: "bold" | "italic" | "underline" | "formatBlock") {
    if (!editorRef.current) return;
    editorRef.current.focus();
    if (command === "formatBlock") {
      document.execCommand("formatBlock", false, "h2");
    } else {
      document.execCommand(command, false);
    }

    const nextHtml = editorRef.current.innerHTML;
    setBodyHtml(nextHtml);
    scheduleEpisodeSave(nextHtml, episodeDraft);
  }

  const topTitle = activeSeries?.title || "Untitled Series";
  const topEpisode = activeEpisode?.title || "Untitled Episode";

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 rounded-[28px] border border-blue-500/30 bg-blue-600/95 px-4 py-4 text-white shadow-2xl shadow-blue-950/30 backdrop-blur-xl">
        <div className="grid gap-4 md:grid-cols-[1.1fr_1fr_auto] md:items-center">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/70">Story Title</p>
            <p className="mt-1 truncate text-lg font-semibold">{topTitle}</p>
            <p className="mt-1 text-sm text-white/75">{topEpisode}</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
              {saveStatus}
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
              {seriesSaveStatus}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm" onClick={() => document.execCommand("undo")}>Undo</button>
            <button type="button" className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm" onClick={() => document.execCommand("redo")}>Redo</button>
            <button type="button" className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm" onClick={() => formatSelection("bold")}>Bold</button>
            <button type="button" className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm" onClick={() => formatSelection("italic")}>Italic</button>
            <button type="button" className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm" onClick={() => formatSelection("underline")}>Underline</button>
            <div className="relative">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-blue-700 shadow-lg"
                onClick={() => setShowTools((value) => !value)}
                aria-label="Open tools"
              >
                ✦
              </button>
              {showTools && (
                <div className="absolute right-0 top-full z-30 mt-2 w-44 rounded-[20px] border border-white/20 bg-blue-700 p-2 shadow-2xl">
                  <button type="button" className="block w-full rounded-[16px] px-3 py-3 text-left text-sm hover:bg-white/10" onClick={() => formatSelection("formatBlock")}>Title</button>
                  <button type="button" className="block w-full rounded-[16px] px-3 py-3 text-left text-sm hover:bg-white/10" onClick={insertSceneBreak}>Scene Break</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <section id="overview" className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Overview</p>
            <h1 className="font-heading theme-heading mt-3 text-3xl font-semibold">
              {activeSeries ? "Story workspace" : "Create your first series"}
            </h1>
            <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
              The story is the product. Build a series first, then a draft episode, then publish when the piece is ready to reach readers.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="story-button-secondary" onClick={() => setFocusMode((value) => !value)}>
              {focusMode ? "Exit Focus" : "Focus Mode"}
            </button>
            {activeEpisode && (
              <button type="button" className="story-button-primary" onClick={() => router.push(publishTarget || "/writer-studio")}>
                Publish
              </button>
            )}
          </div>
        </div>
      </section>

      <section id="series-details" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <p className="eyebrow">Series Details</p>
          <div className="mt-4 grid gap-4">
            <input
              className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm"
              placeholder="Series Name"
              value={seriesDraft.title}
              onChange={(e) => {
                const next = { ...seriesDraft, title: e.target.value };
                setSeriesDraft(next);
                scheduleSeriesSave(next);
              }}
            />
            <textarea
              className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm"
              rows={4}
              placeholder="Description"
              value={seriesDraft.description}
              onChange={(e) => {
                const next = { ...seriesDraft, description: e.target.value };
                setSeriesDraft(next);
                scheduleSeriesSave(next);
              }}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm"
                placeholder="Genre"
                value={seriesDraft.genre}
                onChange={(e) => {
                  const next = { ...seriesDraft, genre: e.target.value };
                  setSeriesDraft(next);
                  scheduleSeriesSave(next);
                }}
              />
              <input
                className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm"
                placeholder="Theme Color"
                value={seriesDraft.themeColor}
                onChange={(e) => {
                  const next = { ...seriesDraft, themeColor: e.target.value };
                  setSeriesDraft(next);
                  scheduleSeriesSave(next);
                }}
              />
            </div>
            <input
              className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm"
              placeholder="Cover Image URL"
              value={seriesDraft.coverImage}
              onChange={(e) => {
                const next = { ...seriesDraft, coverImage: e.target.value };
                setSeriesDraft(next);
                scheduleSeriesSave(next);
              }}
            />
          </div>
          {!activeSeries && (
            <button type="button" className="story-button-primary mt-5" onClick={createSeries}>
              Create Series
            </button>
          )}
        </div>

        <div className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
          <p className="eyebrow">Series Shelf</p>
          <div className="mt-4 space-y-3">
            {seriesList.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-[var(--border-color)] px-4 py-6 text-sm text-[var(--text-secondary)]">
                No series yet. Create one to start writing.
              </div>
            ) : (
              seriesList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectSeries(item.id)}
                  className={`block w-full rounded-[20px] border px-4 py-4 text-left transition ${
                    item.id === activeSeriesId
                      ? "border-[var(--text-primary)] bg-[var(--bg-primary)]"
                      : "border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--text-primary)]"
                  }`}
                >
                  <p className="font-heading text-base font-semibold">{item.title}</p>
                  <p className="theme-meta mt-2 text-xs uppercase tracking-[0.24em]">
                    {item.status} · {item.genre}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <section id="episode-details" className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Episode Details</p>
            <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">
              {activeEpisode ? `Episode ${activeEpisode.episodeNumber}` : "Create a draft episode"}
            </h2>
          </div>
          <button type="button" className="story-button-secondary" disabled={!activeSeries} onClick={createEpisode}>
            New Episode
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <input
            className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm"
            placeholder="Episode Title"
            value={episodeDraft.title}
            onChange={(e) => {
              const next = { ...episodeDraft, title: e.target.value };
              setEpisodeDraft(next);
              scheduleEpisodeSave(bodyHtml, next);
            }}
          />
          <input
            className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm"
            type="number"
            placeholder="Episode Number"
            value={episodeDraft.episodeNumber}
            onChange={(e) => {
              const next = { ...episodeDraft, episodeNumber: Number(e.target.value) };
              setEpisodeDraft(next);
              scheduleEpisodeSave(bodyHtml, next);
            }}
          />
          <textarea
            className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm md:col-span-2"
            rows={3}
            placeholder="Episode Description"
            value={episodeDraft.description}
            onChange={(e) => {
              const next = { ...episodeDraft, description: e.target.value };
              setEpisodeDraft(next);
              scheduleEpisodeSave(bodyHtml, next);
            }}
          />
          <input
            className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm"
            placeholder="Content Warning"
            value={episodeDraft.contentWarning}
            onChange={(e) => {
              const next = { ...episodeDraft, contentWarning: e.target.value };
              setEpisodeDraft(next);
              scheduleEpisodeSave(bodyHtml, next);
            }}
          />
          <select
            className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm"
            value={episodeDraft.aiUsageTag}
            onChange={(e) => {
              const next = { ...episodeDraft, aiUsageTag: e.target.value };
              setEpisodeDraft(next);
              scheduleEpisodeSave(bodyHtml, next);
            }}
          >
            <option value="AI FREE">AI FREE</option>
            <option value="AI CORRECTED">AI CORRECTED</option>
            <option value="AI HEAVY">AI HEAVY</option>
            <option value="AI WRITTEN">AI WRITTEN</option>
          </select>
          <input
            className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm"
            placeholder="Episode Cover Image"
            value={episodeDraft.coverImage}
            onChange={(e) => {
              const next = { ...episodeDraft, coverImage: e.target.value };
              setEpisodeDraft(next);
              scheduleEpisodeSave(bodyHtml, next);
            }}
          />
          <label className="flex items-center gap-3 rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={episodeDraft.locked}
              onChange={(e) => {
                const next = { ...episodeDraft, locked: e.target.checked };
                setEpisodeDraft(next);
                scheduleEpisodeSave(bodyHtml, next);
              }}
            />
            <span>Premium episode</span>
          </label>
        </div>
      </section>

      <section className={`rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 ${focusMode ? "shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" : ""}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Main Writing Area</p>
            <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">Manuscript</h2>
          </div>
          <div className="theme-meta text-xs uppercase tracking-[0.24em]">Autosaves continuously</div>
        </div>

        <div className="mx-auto mt-6 max-w-[820px]">
          {activeEpisode ? (
            <div className="rounded-[30px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)] md:px-8 md:py-10">
              <div className="mb-6 space-y-3 text-center">
                <p className="theme-meta text-xs uppercase tracking-[0.32em]">
                  {activeSeries?.title || "Series"}
                </p>
                <h3 className="font-heading text-3xl font-semibold md:text-4xl">
                  {episodeDraft.title || "Untitled Episode"}
                </h3>
                <p className="theme-meta text-sm">{userName || "Writer"}</p>
              </div>

              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="min-h-[60vh] whitespace-pre-wrap text-[18px] leading-9 outline-none md:text-[20px] md:leading-[2.1rem]"
                onInput={(event) => {
                  const html = (event.currentTarget as HTMLDivElement).innerHTML;
                  setBodyHtml(html);
                  scheduleEpisodeSave(html, episodeDraft);
                }}
                onBlur={() => scheduleEpisodeSave(bodyHtml, episodeDraft)}
                dangerouslySetInnerHTML={{
                  __html: bodyHtml || '<p class="theme-meta text-center">Start writing here.</p>',
                }}
              />
            </div>
          ) : (
            <div className="rounded-[30px] border border-dashed border-[var(--border-color)] bg-[var(--bg-primary)] px-6 py-10 text-center">
              <p className="font-heading text-2xl font-semibold">No episode selected</p>
              <p className="theme-meta mx-auto mt-3 max-w-2xl text-sm leading-6">
                Select or create an episode to start writing. The manuscript will appear here with autosave and simple formatting controls.
              </p>
              {activeSeries && (
                <button type="button" className="story-button-primary mt-5" onClick={createEpisode}>
                  Create Episode
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedEpisodes.length > 0 ? (
          sortedEpisodes.map((episode) => (
            <button
              key={episode.id}
              type="button"
              onClick={() => selectEpisode(episode.id)}
              className={`rounded-[24px] border px-5 py-4 text-left transition ${
                episode.id === activeEpisodeId
                  ? "border-[var(--text-primary)] bg-[var(--bg-secondary)]"
                  : "border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--text-primary)]"
              }`}
            >
              <p className="eyebrow">Episode {episode.episodeNumber}</p>
              <h3 className="mt-2 font-heading text-xl font-semibold">{episode.title}</h3>
              <p className="theme-meta mt-2 text-sm">{episode.status}</p>
            </button>
          ))
        ) : (
          <div className="rounded-[24px] border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] px-5 py-6 text-sm text-[var(--text-secondary)] md:col-span-2 xl:col-span-3">
            Episodes will appear here after you create the first draft.
          </div>
        )}
      </section>
    </div>
  );
}
