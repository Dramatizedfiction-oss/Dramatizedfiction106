"use client";

import { useEffect, useState } from "react";

export default function CEOSettingsPage() {
  const [siteName, setSiteName] = useState("");
  const [enableAds, setEnableAds] = useState(false);
  const [enablePayments, setEnablePayments] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSiteName(data.siteName);
        setEnableAds(data.enableAds);
        setEnablePayments(data.enablePayments);
      });
  }, []);

  async function saveSettings() {
    await fetch("/api/settings", {
      method: "PATCH",
      body: JSON.stringify({
        siteName,
        enableAds,
        enablePayments
      })
    });

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
            onChange={(e) => setEnableAds(e.target.checked)}
          />
          <span className="text-slate-300">Enable Ads</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enablePayments}
            onChange={(e) => setEnablePayments(e.target.checked)}
          />
          <span className="text-slate-300">Enable Payments</span>
        </label>

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
