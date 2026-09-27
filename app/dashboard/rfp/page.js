"use client";

import { useState } from "react";

export default function RfpPage() {
  const [summary, setSummary] = useState("");
  const [rfp, setRfp] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch("/api/rfp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractSummary: summary }),
    });
    const data = await res.json();
    setRfp(data.rfp || data.error || "");
    setLoading(false);
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">AI RFP Generator</h2>
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={6}
        placeholder="Paste the tender details / requirements here…"
        className="w-full px-3 py-2 rounded bg-black/40 border border-gray-700 text-white mb-3"
      />
      <button
        onClick={generate}
        disabled={loading || !summary}
        className="px-4 py-2 rounded bg-abiric-accent hover:bg-abiric-accentLight font-semibold disabled:opacity-50"
      >
        {loading ? "Drafting…" : "Generate RFP"}
      </button>

      {rfp && (
        <pre className="mt-6 whitespace-pre-wrap text-sm bg-abiric-forestDark/40 border border-gray-800 rounded p-4">
          {rfp}
        </pre>
      )}
    </div>
  );
}
