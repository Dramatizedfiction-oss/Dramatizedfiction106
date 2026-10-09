"use client";

import { useState } from "react";
import { Notice, Panel } from "@/components/admin/ui";

type Article = { title: string; quickSectionContent: string; deepSectionContent: string; lastUpdated: string | null };

/** Edits the writer onboarding article (PATCH /api/cms/articles/[slug], BOARD+ on the server). */
export default function OnboardingArticleEditor({ slug, initial }: { slug: string; initial: Article }) {
  const [article, setArticle] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/cms/articles/${slug}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: article.title,
        quickSectionContent: article.quickSectionContent,
        deepSectionContent: article.deepSectionContent,
      }),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as (Partial<Article> & { error?: string }) | null;
    setBusy(false);
    if (!response?.ok || !payload) {
      setMessage({ tone: "error", text: payload?.error || "Couldn't save. Every field is required." });
      return;
    }
    setArticle((current) => ({ ...current, lastUpdated: payload.lastUpdated ?? current.lastUpdated }));
    setMessage({ tone: "success", text: "Saved. Write With Us and Writer Studio guidelines now show this version." });
  }

  return (
    <Panel
      title="Writer onboarding article"
      description="Shown on Write With Us and in Writer Studio guidelines."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Field label="Title">
          <input
            value={article.title}
            onChange={(event) => setArticle({ ...article, title: event.target.value })}
            maxLength={300}
            className="ui-input w-full px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Short section">
          <textarea
            value={article.quickSectionContent}
            onChange={(event) => setArticle({ ...article, quickSectionContent: event.target.value })}
            rows={6}
            className="ui-input w-full px-3 py-2 text-sm leading-6"
          />
        </Field>
        <Field label="Longer section">
          <textarea
            value={article.deepSectionContent}
            onChange={(event) => setArticle({ ...article, deepSectionContent: event.target.value })}
            rows={9}
            className="ui-input w-full px-3 py-2 text-sm leading-6"
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="story-button-primary disabled:opacity-50">
            {busy ? "Saving…" : "Save article"}
          </button>
          <span className="theme-meta text-xs">
            {article.lastUpdated ? `Last saved ${new Date(article.lastUpdated).toLocaleString()}` : "Not saved yet: showing the built-in text."}
          </span>
        </div>
        {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      </form>
    </Panel>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="theme-heading mb-1 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}
