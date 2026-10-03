"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const money = (n) => Number(n || 0).toLocaleString("en-CA", { style: "currency", currency: "CAD" });

const STATUS_STYLES = {
  open: "bg-abiric-salmon/10 text-abiric-salmon border-abiric-salmon/25",
  closed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
  cancelled: "bg-white/5 text-abiric-muted border-white/10",
};

export default function LedgerPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/ledger/accounting-summary", { cache: "no-store" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRows(data.contractProfitability);
    } catch (e) {
      setError(e.message || "Failed to load contracts.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!c.title.toLowerCase().includes(q) && !c.contractNumber.toLowerCase().includes(q) && !c.client.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [rows, search, statusFilter]);

  const summary = useMemo(() => {
    if (!rows) return null;
    return {
      active: rows.filter((c) => c.status === "open").length,
      totalAwarded: rows.reduce((a, c) => a + (c.awardedValue || 0), 0),
      outstanding: rows.reduce((a, c) => a + c.outstanding, 0),
      grossMargin: rows.reduce((a, c) => a + c.grossProfit, 0),
    };
  }, [rows]);

  if (error) return <p className="text-red-300 text-sm">{error}</p>;
  if (!rows) return <p className="text-abiric-muted text-sm">Loading contracts…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-abiric-cream">Contracts</h1>
          <p className="mt-1 text-sm text-abiric-muted">Awarded contract execution, fulfillment and finance.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="abiric-button">+ New Contract</button>
      </div>

      {summary && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Active contracts" value={summary.active} />
          <Stat label="Total awarded value" value={money(summary.totalAwarded)} />
          <Stat label="Outstanding receivables" value={money(summary.outstanding)} />
          <Stat label="Gross margin" value={money(summary.grossMargin)} highlight />
        </section>
      )}

      <section className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contract number, title or client…"
          className="w-full max-w-xs rounded-lg border border-white/10 bg-abiric-charcoal px-3 py-2 text-xs text-abiric-cream outline-none focus:border-abiric-salmon"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-abiric-charcoal px-3 py-2 text-xs text-abiric-cream"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </section>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-abiric-muted">
          No contracts match. Contracts are created automatically when an opportunity is marked Won,
          or manually with "New Contract" above.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="w-full text-left text-xs">
            <thead className="bg-abiric-charcoal text-abiric-muted">
              <tr>
                {["Contract #", "Title", "Client", "Award Value", "Status", "Delivery", "Invoiced", "Received", "Outstanding", "Margin"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filtered.map((c) => (
                <tr key={c.contractId} className="text-abiric-cream hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link href={`/dashboard/ledger/${c.contractId}`} className="font-semibold text-abiric-salmon hover:underline">
                      {c.contractNumber}
                    </Link>
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2">{c.title}</td>
                  <td className="px-3 py-2">{c.client}</td>
                  <td className="whitespace-nowrap px-3 py-2">{c.awardedValue !== null ? money(c.awardedValue) : "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLES[c.status] || STATUS_STYLES.open}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-abiric-muted">{c.deliveryStatus}</td>
                  <td className="whitespace-nowrap px-3 py-2">{money(c.revenue)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{money(c.collected)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{money(c.outstanding)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{c.marginPercent !== null ? `${c.marginPercent.toFixed(1)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && <NewContractModal onClose={() => setModalOpen(false)} onCreated={load} />}
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-abiric-salmon/20 bg-abiric-salmon/[0.05]" : "border-white/[0.07] bg-abiric-charcoal"}`}>
      <p className="text-xs text-abiric-muted">{label}</p>
      <p className={`mt-2 text-lg font-bold ${highlight ? "text-abiric-salmon" : "text-abiric-cream"}`}>{value}</p>
    </div>
  );
}

function NewContractModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ contract_number: "", title: "", line: "procurement", client_name: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/ledger/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Failed to create contract.");
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-white/10 bg-abiric-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-abiric-cream">New Contract</h2>
          <button type="button" onClick={onClose} className="text-abiric-muted hover:text-abiric-cream">✕</button>
        </div>
        {error && <p className="mb-3 text-xs text-red-300">{error}</p>}
        <div className="space-y-3">
          <input required placeholder="Contract number" value={form.contract_number}
            onChange={(e) => setForm({ ...form, contract_number: e.target.value })}
            className="abiric-input text-sm" />
          <input required placeholder="Title" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="abiric-input text-sm" />
          <select value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} className="abiric-input text-sm">
            <option value="procurement">Procurement</option>
            <option value="consulting">Consulting</option>
          </select>
          <input placeholder="Client name" value={form.client_name}
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
            className="abiric-input text-sm" />
        </div>
        <button type="submit" disabled={saving} className="abiric-button mt-5 w-full">
          {saving ? "Creating…" : "Create Contract"}
        </button>
      </form>
    </div>
  );
}
