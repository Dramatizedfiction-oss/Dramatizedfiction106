"use client";

import { useEffect, useState } from "react";
import { WRITER_ONBOARDING_SLUG } from "@/lib/cms";

type OnboardingArticle = {
  title: string;
  quickSectionContent: string;
  deepSectionContent: string;
  lastUpdated: string;
};

export default function CEOSettingsPage() {
  const [siteName, setSiteName] = useState("");
  const [enableAds, setEnableAds] = useState(false);
  const [enablePayments, setEnablePayments] = useState(false);
  const [phaseTwoUnlocked, setPhaseTwoUnlocked] = useState(false);
  const [phaseThreeUnlocked, setPhaseThreeUnlocked] = useState(false);
  const [phaseTwoCode, setPhaseTwoCode] = useState("");
  const [phaseThreeCode, setPhaseThreeCode] = useState("");
  const [article, setArticle] = useState<OnboardingArticle>({
    title: "",
    quickSectionContent: "",
    deepSectionContent: "",
    lastUpdated: "",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSiteName(data.siteName);
        setEnableAds(data.enableAds);
        setEnablePayments(data.enablePayments);
        setPhaseTwoUnlocked(data.phaseTwoUnlocked);
        setPhaseThreeUnlocked(data.phaseThreeUnlocked);
      });

    fetch(`/api/cms/articles/${WRITER_ONBOARDING_SLUG}`)
      .then((res) => res.json())
      .then((data) => setArticle(data));
  }, []);

  async function saveSettings() {
    await fetch("/api/settings", {
      method: "PATCH",
      body: JSON.stringify({
        siteName,
        enableAds,
        enablePayments,
        phaseTwoUnlocked,
        phaseThreeUnlocked,
        phaseTwoCode,
        phaseThreeCode,
      }),
    });

    setPhaseTwoCode("");
    setPhaseThreeCode("");
    alert("Platform settings saved.");
  }

  async function saveOnboardingArticle() {
    const response = await fetch(`/api/cms/articles/${WRITER_ONBOARDING_SLUG}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: article.title,
        quickSectionContent: article.quickSectionContent,
        deepSectionContent: article.deepSectionContent,
      }),
    });

    const updated = await response.json();
    setArticle(updated);
    alert("Writer onboarding updated.");
  }

  return (
    <main className="px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="theme-panel rounded-[28px] border border-[var(--border-color)] p-6">
          <p className="eyebrow">Platform Settings</p>
          <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold">
            Command Center controls
          </h1>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="theme-meta text-sm">Site Name</span>
              <input
                className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)]"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] px-4 py-3">
              <input
                type="checkbox"
                checked={enableAds}
                disabled={!phaseThreeUnlocked}
                onChange={(e) => setEnableAds(e.target.checked)}
              />
              <span className="theme-body text-sm">Enable Ads (Phase 3)</span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] px-4 py-3">
              <input
                type="checkbox"
                checked={enablePayments}
                disabled={!phaseTwoUnlocked}
                onChange={(e) => setEnablePayments(e.target.checked)}
              />
              <span className="theme-body text-sm">Enable Payments (Phase 2)</span>
            </label>

            <UnlockCard
              title="Phase 2 Unlock"
              description="Monetization stays inactive until unlocked with the CEO code."
              code={phaseTwoCode}
              setCode={setPhaseTwoCode}
              checked={phaseTwoUnlocked}
              setChecked={setPhaseTwoUnlocked}
              placeholder={phaseTwoUnlocked ? "Phase 2 already unlocked" : "Enter CEO code"}
            />

            <UnlockCard
              title="Phase 3 Unlock"
              description="Ads remain void until unlocked with the CEO code."
              code={phaseThreeCode}
              setCode={setPhaseThreeCode}
              checked={phaseThreeUnlocked}
              setChecked={setPhaseThreeUnlocked}
              placeholder={phaseThreeUnlocked ? "Phase 3 already unlocked" : "Enter CEO code"}
            />

            <button onClick={saveSettings} className="story-button-primary">
              Save Platform Settings
            </button>
          </div>
        </section>

        <section className="theme-panel rounded-[28px] border border-[var(--border-color)] p-6">
          <p className="eyebrow">Writer Onboarding CMS</p>
          <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold">
            Shared onboarding article
          </h2>
          <p className="theme-meta mt-3 text-sm">
            This powers the writer onboarding flow. The UI reads from this article instead of hardcoded page copy.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="theme-meta text-sm">Title</span>
              <input
                className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)]"
                value={article.title}
                onChange={(e) =>
                  setArticle((current) => ({ ...current, title: e.target.value }))
                }
              />
            </label>

            <label className="block">
              <span className="theme-meta text-sm">Quick section content</span>
              <textarea
                className="mt-2 min-h-[160px] w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)]"
                value={article.quickSectionContent}
                onChange={(e) =>
                  setArticle((current) => ({
                    ...current,
                    quickSectionContent: e.target.value,
                  }))
                }
              />
            </label>

            <label className="block">
              <span className="theme-meta text-sm">Deep section content</span>
              <textarea
                className="mt-2 min-h-[220px] w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)]"
                value={article.deepSectionContent}
                onChange={(e) =>
                  setArticle((current) => ({
                    ...current,
                    deepSectionContent: e.target.value,
                  }))
                }
              />
            </label>

            <p className="theme-meta text-xs uppercase tracking-[0.24em]">
              Last updated {article.lastUpdated ? new Date(article.lastUpdated).toLocaleString() : "Not saved yet"}
            </p>

            <button onClick={saveOnboardingArticle} className="story-button-primary">
              Save Onboarding Article
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function UnlockCard({
  title,
  description,
  code,
  setCode,
  checked,
  setChecked,
  placeholder,
}: {
  title: string;
  description: string;
  code: string;
  setCode: (value: string) => void;
  checked: boolean;
  setChecked: (value: boolean) => void;
  placeholder: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
      <div>
        <p className="theme-heading font-semibold">{title}</p>
        <p className="theme-meta mt-2 text-sm">{description}</p>
      </div>

      <input
        className="mt-4 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-[var(--text-primary)]"
        placeholder={placeholder}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        disabled={checked}
      />

      <label className="mt-4 flex items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span className="theme-body text-sm">Unlock</span>
      </label>
    </div>
  );
}
