"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import Link from "next/link";

const FIELDS = [
  { key: "title", label: "Title", required: true },
  { key: "reference_number", label: "Reference / Solicitation #" },
  { key: "organization", label: "Organization / Client" },
  { key: "category", label: "Category" },
  { key: "region", label: "Region" },
  { key: "closing_date", label: "Closing Date" },
  { key: "estimated_value", label: "Estimated Value" },
  { key: "tender_url", label: "Tender URL" },
  { key: "notes", label: "Notes" },
];

const AUTO_MATCH = {
  title: ["title"],
  reference_number: ["reference number", "reference_number", "solicitation number", "reference"],
  organization: ["organization name", "organization", "department", "client"],
  category: ["category"],
  region: ["region"],
  closing_date: ["closing date", "closing_date"],
  estimated_value: ["estimated value", "estimated_value", "value"],
  tender_url: ["tender url", "url", "link"],
  notes: ["notes"],
};

function autoDetect(headers) {
  const mapping = {};
  for (const field of FIELDS) {
    const match = headers.find((h) => AUTO_MATCH[field.key]?.includes(h.trim().toLowerCase()));
    mapping[field.key] = match || "";
  }
  return mapping;
}

export default function ImportOpportunitiesPage() {
  const [step, setStep] = useState("upload"); // upload | map | preview | results
  const [headers, setHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [existingRefs, setExistingRefs] = useState(new Set());
  const [selected, setSelected] = useState({});
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    fetch("/api/contracts/track")
      .then((r) => r.json())
      .then((d) => setExistingRefs(new Set((d.contracts || []).map((c) => c.reference_number).filter(Boolean))));
  }, []);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setHeaders(res.meta.fields || []);
        setCsvRows(res.data);
        setMapping(autoDetect(res.meta.fields || []));
        setStep("map");
      },
    });
  }

  function proceedToPreview() {
    const mapped = csvRows.map((raw) => {
      const row = { _raw: raw };
      for (const field of FIELDS) {
        const col = mapping[field.key];
        row[field.key] = col ? raw[col] : "";
      }
      return row;
    });
    const sel = {};
    mapped.forEach((row, i) => {
      sel[i] = !!row.title?.trim();
    });
    setSelected(sel);
    setCsvRows(mapped);
    setStep("preview");
  }

  async function runImport() {
    setImporting(true);
    const rowsToImport = csvRows.filter((_, i) => selected[i]);
    const res = await fetch("/api/contracts/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: rowsToImport }),
    });
    const data = await res.json();
    setImporting(false);
    setResults(data);
    setStep("results");
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-abiric-cream">Import Opportunities</h1>
        <p className="mt-1 text-sm text-abiric-muted">
          Upload a CSV exported from CanadaBuys, SAP Ariba, or a manually prepared spreadsheet.
        </p>
      </div>

      {step === "upload" && (
        <div className="abiric-card">
          <label className="block">
            <span className="abiric-label">CSV file</span>
            <input type="file" accept=".csv" onChange={handleFile} className="mt-2 block text-sm text-abiric-cream" />
          </label>
          <p className="mt-4 text-xs text-abiric-muted">
            After upload, you'll map columns to ABIRIC fields and review every row before anything
            is imported.
          </p>
        </div>
      )}

      {step === "map" && (
        <div className="abiric-card space-y-4">
          <h2 className="text-sm font-semibold text-abiric-cream">Map columns</h2>
          <p className="text-xs text-abiric-muted">{csvRows.length} rows detected. Confirm or adjust the mapping below.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-semibold text-abiric-muted">
                  {f.label}{f.required && <span className="text-abiric-salmon"> *</span>}
                </label>
                <select
                  value={mapping[f.key] || ""}
                  onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-abiric-charcoal px-2 py-1.5 text-xs text-abiric-cream"
                >
                  <option value="">— not mapped —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            onClick={proceedToPreview}
            disabled={!mapping.title}
            className="abiric-button disabled:opacity-50"
          >
            Preview →
          </button>
          {!mapping.title && <p className="text-xs text-amber-400">Title must be mapped to continue.</p>}
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-abiric-muted">
              {Object.values(selected).filter(Boolean).length} of {csvRows.length} rows selected for import.
            </p>
            <button onClick={runImport} disabled={importing} className="abiric-button disabled:opacity-50">
              {importing ? "Importing…" : "Import Selected"}
            </button>
          </div>
          <div className="max-h-[500px] overflow-auto rounded-xl border border-white/[0.07]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-abiric-charcoal text-abiric-muted">
                <tr>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2">Title</th>
                  <th className="px-2 py-2">Reference</th>
                  <th className="px-2 py-2">Organization</th>
                  <th className="px-2 py-2">Est. Value</th>
                  <th className="px-2 py-2">Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {csvRows.map((row, i) => {
                  const isDuplicate = row.reference_number && existingRefs.has(row.reference_number.trim());
                  const isInvalid = !row.title?.trim();
                  return (
                    <tr key={i} className={isInvalid ? "opacity-50" : ""}>
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={!!selected[i]}
                          disabled={isInvalid}
                          onChange={(e) => setSelected({ ...selected, [i]: e.target.checked })}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-abiric-cream">{row.title || "—"}</td>
                      <td className="px-2 py-1.5 text-abiric-muted">{row.reference_number || "—"}</td>
                      <td className="px-2 py-1.5 text-abiric-muted">{row.organization || "—"}</td>
                      <td className="px-2 py-1.5 text-abiric-muted">{row.estimated_value || "—"}</td>
                      <td className="px-2 py-1.5">
                        {isInvalid && <span className="text-red-300">Missing title</span>}
                        {!isInvalid && isDuplicate && <span className="text-amber-400">Possible duplicate</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === "results" && results && (
        <div className="abiric-card space-y-3">
          <h2 className="text-sm font-semibold text-abiric-cream">
            Imported {results.imported} of {results.results.length} selected rows.
          </h2>
          <ul className="max-h-[400px] space-y-1 overflow-auto text-xs">
            {results.results.map((r, i) => (
              <li key={i} className={
                r.status === "imported" ? "text-emerald-300" : r.status === "duplicate" ? "text-amber-400" : "text-red-300"
              }>
                {r.row.title || "(untitled)"} — {r.status}{r.message ? `: ${r.message}` : ""}
              </li>
            ))}
          </ul>
          <Link href="/dashboard/opportunities" className="abiric-button inline-block">
            View Opportunities →
          </Link>
        </div>
      )}
    </div>
  );
}
