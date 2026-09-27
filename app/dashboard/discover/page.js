"use client";

import { useState } from "react";

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    const res = await fetch(`/api/contracts?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setContracts(data.contracts || []);
    setLoading(false);
  }

  async function track(contract) {
    await fetch("/api/contracts/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contract }),
    });
    alert("Tracked — check the Pipeline tab.");
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Contract Discovery</h2>
      <div className="flex gap-2 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search keyword, category, region…"
          className="flex-1 px-3 py-2 rounded bg-black/40 border border-gray-700 text-white"
        />
        <button
          onClick={search}
          className="px-4 py-2 rounded bg-abiric-accent hover:bg-abiric-accentLight font-semibold"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      <div className="space-y-3">
        {contracts.map((c, i) => (
          <div key={i} className="border border-gray-800 rounded p-4 bg-abiric-forestDark/40">
            <div className="font-semibold">{c["Title"] || c.title || "Untitled tender"}</div>
            <div className="text-xs text-gray-400 mt-1">
              {c["Reference number"] || ""} · {c["Region"] || ""} · {c["Category"] || ""}
            </div>
            <button
              onClick={() => track(c)}
              className="mt-3 text-sm px-3 py-1 rounded bg-abiric-accent/80 hover:bg-abiric-accentLight"
            >
              Track this contract
            </button>
          </div>
        ))}
        {!loading && contracts.length === 0 && (
          <p className="text-gray-500 text-sm">Search above to pull live CanadaBuys tenders.</p>
        )}
      </div>
    </div>
  );
}
