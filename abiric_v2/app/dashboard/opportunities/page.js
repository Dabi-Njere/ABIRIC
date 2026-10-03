"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const money = (n) =>
  n === null || n === undefined || n === "" ? "—" : Number(n).toLocaleString("en-CA", { style: "currency", currency: "CAD" });

const STAGE_STYLES = {
  New: "bg-white/5 text-abiric-muted border-white/10",
  Reviewing: "bg-abiric-salmon/10 text-abiric-salmonLight border-abiric-salmon/20",
  Bidding: "bg-abiric-salmon/10 text-abiric-salmon border-abiric-salmon/25",
  Submitted: "bg-abiric-salmon/15 text-abiric-salmon border-abiric-salmon/30",
  Won: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
  Passed: "bg-white/5 text-abiric-muted border-white/10",
};

export default function OpportunitiesPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/contracts/track", { cache: "no-store" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRows(data.contracts || []);
    } catch (e) {
      setError(e.message || "Failed to load opportunities.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((o) => {
      if (stageFilter && o.stage !== stageFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const org = o.organization || "";
        if (!o.title.toLowerCase().includes(q) && !(o.reference_number || "").toLowerCase().includes(q) && !org.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [rows, search, stageFilter]);

  if (error) return <p className="text-red-300 text-sm">{error}</p>;
  if (!rows) return <p className="text-abiric-muted text-sm">Loading opportunities…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="abiric-eyebrow">Business Development</p>
          <h1 className="text-2xl font-bold text-abiric-cream">Opportunities</h1>
          <p className="mt-1 text-sm text-abiric-muted">Every tracked opportunity, searchable in one place.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/opportunities/import" className="abiric-button-secondary">Import CSV</Link>
          <button onClick={() => setAddOpen(true)} className="abiric-button">+ Add Opportunity</button>
        </div>
      </div>

      <section className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, reference or organization…"
          className="w-full max-w-xs rounded-lg border border-white/10 bg-abiric-charcoal px-3 py-2 text-xs text-abiric-cream outline-none focus:border-abiric-salmon"
        />
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-abiric-charcoal px-3 py-2 text-xs text-abiric-cream"
        >
          <option value="">All stages</option>
          {Object.keys(STAGE_STYLES).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <Link href="/dashboard/pipeline" className="ml-auto text-xs font-semibold text-abiric-salmon hover:text-abiric-salmonLight self-center">
          Open Pipeline board →
        </Link>
      </section>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-abiric-muted">
          No opportunities match. Add one manually or import a CSV above.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="w-full text-left text-xs">
            <thead className="bg-abiric-charcoal">
              <tr>
                {["Title", "Reference", "Organization", "Closing", "Est. Value", "Stage"].map((h) => (
                  <th key={h} className="abiric-th whitespace-nowrap px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filtered.map((o) => (
                <tr key={o.id} className="text-abiric-cream hover:bg-white/[0.02]">
                  <td className="max-w-[260px] truncate px-3 py-2">{o.title}</td>
                  <td className="px-3 py-2 text-abiric-muted">{o.reference_number || "—"}</td>
                  <td className="px-3 py-2 text-abiric-muted">{o.organization || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-abiric-muted">{o.closing_date || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2">{money(o.estimated_value)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${STAGE_STYLES[o.stage] || STAGE_STYLES.New}`}>
                      {o.stage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && <AddOpportunityModal onClose={() => setAddOpen(false)} onCreated={load} />}
    </div>
  );
}

function AddOpportunityModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "", reference_number: "", organization: "", category: "", region: "",
    closing_date: "", estimated_value: "", tender_url: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/contracts/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Failed to create opportunity.");
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-white/10 bg-abiric-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-abiric-cream">Add Opportunity</h2>
          <button type="button" onClick={onClose} className="text-abiric-muted hover:text-abiric-cream">✕</button>
        </div>
        {error && <p className="mb-3 text-xs text-red-300">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <input required placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="abiric-input col-span-2 text-sm" />
          <input placeholder="Reference #" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} className="abiric-input text-sm" />
          <input placeholder="Organization" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} className="abiric-input text-sm" />
          <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="abiric-input text-sm" />
          <input placeholder="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="abiric-input text-sm" />
          <input placeholder="Closing date (YYYY-MM-DD)" value={form.closing_date} onChange={(e) => setForm({ ...form, closing_date: e.target.value })} className="abiric-input text-sm" />
          <input placeholder="Estimated value" type="number" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} className="abiric-input text-sm" />
          <input placeholder="Tender URL" value={form.tender_url} onChange={(e) => setForm({ ...form, tender_url: e.target.value })} className="abiric-input col-span-2 text-sm" />
        </div>
        <button type="submit" disabled={saving} className="abiric-button mt-5 w-full">{saving ? "Creating…" : "Add Opportunity"}</button>
      </form>
    </div>
  );
}
