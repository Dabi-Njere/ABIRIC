"use client";

import { useState } from "react";

export default function RfpPage() {
  const [sourceText, setSourceText] = useState("");
  const [mode, setMode] = useState("draft");
  const [result, setResult] = useState("");
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const res = await fetch("/api/rfp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, sourceText }),
    });
    const data = await res.json();
    setLoading(false);
    setAvailable(data.available !== false);
    setResult(data.result || data.message || data.error || "");
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">AI Drafting (optional)</h2>
      <p className="text-xs text-gray-500 mb-4">
        Text-only assistance for summarizing a tender or drafting a proposal. It never touches
        ledger numbers — those live entirely in the Ledger tab, computed without AI.
      </p>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode("summarize")}
          className={`px-3 py-1 rounded text-sm ${mode === "summarize" ? "bg-abiric-accent" : "bg-gray-800"}`}
        >
          Summarize
        </button>
        <button
          onClick={() => setMode("draft")}
          className={`px-3 py-1 rounded text-sm ${mode === "draft" ? "bg-abiric-accent" : "bg-gray-800"}`}
        >
          Draft proposal
        </button>
      </div>

      <textarea
        value={sourceText}
        onChange={(e) => setSourceText(e.target.value)}
        rows={6}
        placeholder="Paste tender text or contract details here…"
        className="w-full px-3 py-2 rounded bg-black/40 border border-gray-700 text-white mb-3"
      />
      <button
        onClick={run}
        disabled={loading || !sourceText}
        className="px-4 py-2 rounded bg-abiric-accent hover:bg-abiric-accentLight font-semibold disabled:opacity-50"
      >
        {loading ? "Working…" : "Run"}
      </button>

      {!available && (
        <p className="mt-4 text-sm text-amber-400">
          AI drafting isn't configured (no ANTHROPIC_API_KEY set). This is optional — everything
          else in Abiric works without it.
        </p>
      )}

      {result && (
        <pre className="mt-6 whitespace-pre-wrap text-sm bg-abiric-forestDark/40 border border-gray-800 rounded p-4">
          {result}
        </pre>
      )}
    </div>
  );
}
