"use client";

import { useEffect, useState } from "react";

export default function CEOSettingsPage() {
  const [siteName, setSiteName] = useState("");
  const [enableAds, setEnableAds] = useState(false);
  const [enablePayments, setEnablePayments] = useState(false);
  const [phaseTwoUnlocked, setPhaseTwoUnlocked] = useState(false);
  const [phaseThreeUnlocked, setPhaseThreeUnlocked] = useState(false);
  const [phaseTwoCode, setPhaseTwoCode] = useState("");
  const [phaseThreeCode, setPhaseThreeCode] = useState("");

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
        phaseThreeCode
      })
    });

    setPhaseTwoCode("");
    setPhaseThreeCode("");
    alert("Settings saved.");
  }

  return (
    <main className="p-8 max-w-xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Platform Settings</h1>

      <div className="space-y-4">
        <label className="block">
          <span className="text-slate-300">Site Name</span>
          <input
            className="w-full p-2 bg-slate-900 border border-slate-700 rounded mt-1"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enableAds}
            disabled={!phaseThreeUnlocked}
            onChange={(e) => setEnableAds(e.target.checked)}
          />
          <span className="text-slate-300">Enable Ads (Phase 3)</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enablePayments}
            disabled={!phaseTwoUnlocked}
            onChange={(e) => setEnablePayments(e.target.checked)}
          />
          <span className="text-slate-300">Enable Payments (Phase 2)</span>
        </label>

        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3">
          <div>
            <p className="text-slate-200 font-semibold">Phase 2 Unlock</p>
            <p className="text-slate-400 text-sm">
              Monetization stays inactive until unlocked with the CEO code.
            </p>
          </div>

          <input
            className="w-full p-2 bg-slate-900 border border-slate-700 rounded"
            placeholder={phaseTwoUnlocked ? "Phase 2 already unlocked" : "Enter CEO code"}
            value={phaseTwoCode}
            onChange={(e) => setPhaseTwoCode(e.target.value)}
            disabled={phaseTwoUnlocked}
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={phaseTwoUnlocked}
              disabled={phaseTwoUnlocked}
              onChange={(e) => setPhaseTwoUnlocked(e.target.checked)}
            />
            <span className="text-slate-300">Unlock Phase 2</span>
          </label>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3">
          <div>
            <p className="text-slate-200 font-semibold">Phase 3 Unlock</p>
            <p className="text-slate-400 text-sm">
              Ads remain void until unlocked with the CEO code.
            </p>
          </div>

          <input
            className="w-full p-2 bg-slate-900 border border-slate-700 rounded"
            placeholder={phaseThreeUnlocked ? "Phase 3 already unlocked" : "Enter CEO code"}
            value={phaseThreeCode}
            onChange={(e) => setPhaseThreeCode(e.target.value)}
            disabled={phaseThreeUnlocked}
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={phaseThreeUnlocked}
              disabled={phaseThreeUnlocked}
              onChange={(e) => setPhaseThreeUnlocked(e.target.checked)}
            />
            <span className="text-slate-300">Unlock Phase 3</span>
          </label>
        </div>

        <button
          onClick={saveSettings}
          className="w-full bg-blue-600 hover:bg-blue-500 p-3 rounded font-semibold"
        >
          Save Settings
        </button>
      </div>
    </main>
  );
}
