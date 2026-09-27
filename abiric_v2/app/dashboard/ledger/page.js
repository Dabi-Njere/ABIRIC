"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function LedgerPage() {
  const [contracts, setContracts] = useState([]);
  const [form, setForm] = useState({ contract_number: "", title: "", line: "procurement", client_name: "" });
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/ledger/contracts");
    const data = await res.json();
    setContracts(data.contracts || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createContract(e) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/ledger/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      setForm({ contract_number: "", title: "", line: "procurement", client_name: "" });
      load();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to create contract.");
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Ledger — Contracts</h2>

      <form onSubmit={createContract} className="grid grid-cols-2 gap-3 mb-8 bg-abiric-forestDark/40 border border-gray-800 rounded p-4">
        <input
          required
          placeholder="Contract number (e.g. ABI-2026-001)"
          value={form.contract_number}
          onChange={(e) => setForm({ ...form, contract_number: e.target.value })}
          className="px-3 py-2 rounded bg-black/40 border border-gray-700"
        />
        <input
          required
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="px-3 py-2 rounded bg-black/40 border border-gray-700"
        />
        <select
          value={form.line}
          onChange={(e) => setForm({ ...form, line: e.target.value })}
          className="px-3 py-2 rounded bg-black/40 border border-gray-700"
        >
          <option value="procurement">Procurement</option>
          <option value="consulting">Consulting</option>
        </select>
        <input
          placeholder="Client name"
          value={form.client_name}
          onChange={(e) => setForm({ ...form, client_name: e.target.value })}
          className="px-3 py-2 rounded bg-black/40 border border-gray-700"
        />
        <button
          type="submit"
          disabled={loading}
          className="col-span-2 py-2 rounded bg-abiric-accent hover:bg-abiric-accentLight font-semibold"
        >
          {loading ? "Creating…" : "Create Contract"}
        </button>
      </form>

      <div className="space-y-2">
        {contracts.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/ledger/${c.id}`}
            className="block border border-gray-800 rounded p-3 bg-abiric-forestDark/30 hover:bg-abiric-forestDark/50"
          >
            <div className="flex justify-between">
              <span className="font-semibold">{c.contract_number} — {c.title}</span>
              <span className="text-xs uppercase text-gray-400">{c.line}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {c.client_name || "No client set"} · tax reserve {c.tax_reserve_percent}% · {c.status}
            </div>
          </Link>
        ))}
        {contracts.length === 0 && <p className="text-gray-500 text-sm">No contracts yet.</p>}
      </div>
    </div>
  );
}
