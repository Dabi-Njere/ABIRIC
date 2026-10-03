"use client";

import { useEffect, useMemo, useState } from "react";

const TABS = ["Company", "Users", "Audit Log"];

export default function AdminPage() {
  const [tab, setTab] = useState("Company");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-abiric-cream">Admin</h1>
        <p className="mt-1 text-sm text-abiric-muted">Company settings, users, and the audit trail.</p>
      </div>

      <div className="flex gap-2 border-b border-white/[0.07]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold transition ${
              tab === t
                ? "border-b-2 border-abiric-salmon text-abiric-cream"
                : "text-abiric-muted hover:text-abiric-cream"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Company" && <CompanyTab />}
      {tab === "Users" && <UsersTab />}
      {tab === "Audit Log" && <AuditLogTab />}
    </div>
  );
}

function CompanyTab() {
  const [company, setCompany] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/company")
      .then((r) => r.json())
      .then((d) => setCompany(d.company || {}));
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/admin/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(company),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setCompany(data.company);
      setSaved(true);
    } else {
      alert(data.error || "Failed to save.");
    }
  }

  if (!company) return <p className="text-abiric-muted text-sm">Loading…</p>;

  const field = (key, label, type = "text") => (
    <div>
      <label className="mb-1 block text-xs font-semibold text-abiric-muted">{label}</label>
      <input
        type={type}
        value={company[key] || ""}
        onChange={(e) => setCompany({ ...company, [key]: e.target.value })}
        className="w-full rounded-lg border border-white/10 bg-abiric-charcoal px-3 py-2 text-sm text-abiric-cream outline-none focus:border-abiric-salmon"
      />
    </div>
  );

  return (
    <form onSubmit={save} className="abiric-card max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("legal_name", "Legal name")}
        {field("operating_name", "Operating name")}
        {field("address", "Address")}
        {field("phone", "Phone")}
        {field("email", "Email")}
        {field("business_number", "Business number")}
        {field("gst_hst_number", "GST/HST number")}
        {field("default_tax_rate", "Default tax rate (%)", "number")}
        {field("fiscal_year_end", "Fiscal year end")}
        {field("invoice_prefix", "Invoice prefix")}
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-abiric-salmon px-4 py-2 text-xs font-bold text-abiric-black disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-xs text-emerald-300">Saved.</span>}
      </div>
    </form>
  );
}

function UsersTab() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setUsers(d.users)));
  }, []);

  if (error) return <p className="text-red-300 text-sm">{error}</p>;
  if (!users) return <p className="text-abiric-muted text-sm">Loading…</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
      <table className="w-full text-left text-xs">
        <thead className="bg-abiric-charcoal text-abiric-muted">
          <tr>
            <th className="px-3 py-2 font-semibold uppercase tracking-wide">Name</th>
            <th className="px-3 py-2 font-semibold uppercase tracking-wide">Email</th>
            <th className="px-3 py-2 font-semibold uppercase tracking-wide">Role</th>
            <th className="px-3 py-2 font-semibold uppercase tracking-wide">Admin</th>
            <th className="px-3 py-2 font-semibold uppercase tracking-wide">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {users.map((u) => (
            <tr key={u.id} className="text-abiric-cream">
              <td className="px-3 py-2">{u.name || "—"}</td>
              <td className="px-3 py-2">{u.email}</td>
              <td className="px-3 py-2">{u.role || "—"}</td>
              <td className="px-3 py-2">{u.is_admin ? "Yes" : "No"}</td>
              <td className="px-3 py-2">{new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-white/[0.07] bg-abiric-charcoal/50 px-3 py-2 text-[11px] text-abiric-muted">
        Role/permission editing UI is not built yet — this is a read view of the existing{" "}
        <code>users</code> table.
      </p>
    </div>
  );
}

function AuditLogTab() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/audit-log")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setEntries(d.entries)));
  }, []);

  const filtered = useMemo(() => {
    if (!entries) return [];
    if (!search.trim()) return entries;
    const q = search.trim().toLowerCase();
    return entries.filter(
      (e) => e.action.toLowerCase().includes(q) || e.user.toLowerCase().includes(q)
    );
  }, [entries, search]);

  if (error) return <p className="text-red-300 text-sm">{error}</p>;
  if (!entries) return <p className="text-abiric-muted text-sm">Loading…</p>;

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter by action or user…"
        className="w-full max-w-xs rounded-lg border border-white/10 bg-abiric-charcoal px-3 py-2 text-xs text-abiric-cream outline-none focus:border-abiric-salmon"
      />
      <div className="max-h-[600px] overflow-y-auto rounded-xl border border-white/[0.07]">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-abiric-charcoal text-abiric-muted">
            <tr>
              <th className="px-3 py-2 font-semibold uppercase tracking-wide">Timestamp</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wide">User</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wide">Action</th>
              <th className="px-3 py-2 font-semibold uppercase tracking-wide">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {filtered.map((e) => (
              <tr key={e.id} className="align-top text-abiric-cream">
                <td className="whitespace-nowrap px-3 py-2 text-abiric-muted">
                  {new Date(e.timestamp).toLocaleString()}
                </td>
                <td className="px-3 py-2">{e.user}</td>
                <td className="px-3 py-2 font-medium">{e.action}</td>
                <td className="max-w-xs truncate px-3 py-2 text-abiric-muted" title={JSON.stringify(e.details)}>
                  {e.details ? JSON.stringify(e.details) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
