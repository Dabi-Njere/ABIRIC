"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const money = (n) => Number(n || 0).toLocaleString("en-CA", { style: "currency", currency: "CAD" });

const TABS = [
  "Overview",
  "Sourcing",
  "Purchasing",
  "Delivery",
  "Expenses",
  "Financing",
  "Invoicing",
  "Payments",
  "Profitability",
];

export default function ContractWorkspace({ params }) {
  const { contractId } = params;
  const [tab, setTab] = useState("Overview");
  const [contract, setContract] = useState(null);
  const [summary, setSummary] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [lots, setLots] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [financingRows, setFinancingRows] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [taxPct, setTaxPct] = useState(15);

  async function loadAll() {
    const [c, s, q, l, e, f, i, p] = await Promise.all([
      fetch(`/api/ledger/contracts/${contractId}`).then((r) => r.json()),
      fetch(`/api/ledger/summary/${contractId}`).then((r) => r.json()),
      fetch(`/api/ledger/quotes?contract_id=${contractId}`).then((r) => r.json()),
      fetch(`/api/ledger/lots?contract_id=${contractId}`).then((r) => r.json()),
      fetch(`/api/ledger/expenses?contract_id=${contractId}`).then((r) => r.json()),
      fetch(`/api/ledger/financing?contract_id=${contractId}`).then((r) => r.json()),
      fetch(`/api/ledger/invoices?contract_id=${contractId}`).then((r) => r.json()),
      fetch(`/api/ledger/payments?contract_id=${contractId}`).then((r) => r.json()),
    ]);
    setContract(c.contract);
    setSummary(s.summary);
    setQuotes(q.quotes || []);
    setLots(l.lots || []);
    setExpenses(e.expenses || []);
    setFinancingRows(f.financing || []);
    setInvoices(i.invoices || []);
    setPayments(p.payments || []);
    if (c.contract) setTaxPct(c.contract.tax_reserve_percent);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  async function post(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contract_id: contractId, ...body }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Request failed.");
      return false;
    }
    await loadAll();
    return true;
  }

  async function saveTaxPct() {
    await fetch(`/api/ledger/contracts/${contractId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tax_reserve_percent: Number(taxPct) }),
    });
    loadAll();
  }

  if (!contract) return <p className="text-abiric-muted text-sm">Loading…</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-abiric-cream">{contract.contract_number} — {contract.title}</h1>
        <p className="text-xs uppercase tracking-wide text-abiric-muted">{contract.line} · {contract.status} · {contract.client_name || "No client on file"}</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-white/[0.07]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-2 text-xs font-semibold transition ${
              tab === t ? "border-b-2 border-abiric-salmon text-abiric-cream" : "text-abiric-muted hover:text-abiric-cream"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && summary && (
        <OverviewTab contract={contract} summary={summary} taxPct={taxPct} setTaxPct={setTaxPct} onSaveTax={saveTaxPct} />
      )}

      {tab === "Sourcing" && (
        <Section
          title="Supplier Quotes"
          items={quotes}
          renderItem={(q) => `${q.supplier_name} — ${money(q.quoted_amount)} (${q.status})`}
          fields={[
            { key: "supplier_name", label: "Supplier" },
            { key: "quoted_amount", label: "Amount", type: "number" },
          ]}
          onSubmit={(body) => post("/api/ledger/quotes", body)}
          empty="No supplier quotes yet."
        />
      )}

      {tab === "Purchasing" && (
        <Section
          title="Purchase Lots (actual cost)"
          items={lots}
          renderItem={(l) => `${l.supplier_name} — ${l.quantity} ${l.unit || ""} @ ${money(l.actual_unit_cost)}/u = ${money(l.actual_total_cost)}`}
          fields={[
            { key: "supplier_name", label: "Supplier" },
            { key: "quantity", label: "Quantity", type: "number" },
            { key: "unit", label: "Unit" },
            { key: "actual_total_cost", label: "Actual total cost", type: "number" },
          ]}
          onSubmit={(body) => post("/api/ledger/lots", body)}
          empty="No purchase lots recorded yet."
        />
      )}

      {tab === "Delivery" && (
        <DeliveryTab lots={lots} onRecorded={loadAll} />
      )}

      {tab === "Expenses" && (
        <Section
          title="Direct Expenses"
          items={expenses}
          renderItem={(e) => `${e.category} — ${money(e.amount)}${e.gst_hst_amount ? ` (+${money(e.gst_hst_amount)} GST/HST)` : ""}`}
          fields={[
            { key: "category", label: "Category" },
            { key: "payee", label: "Payee" },
            { key: "amount", label: "Subtotal", type: "number" },
            { key: "gst_hst_amount", label: "GST/HST", type: "number" },
            { key: "receipt_reference", label: "Receipt/reference" },
          ]}
          onSubmit={(body) => post("/api/ledger/expenses", body)}
          empty="No direct expenses recorded yet."
        />
      )}

      {tab === "Financing" && (
        <Section
          title="Financing"
          items={financingRows}
          renderItem={(f) => `${f.provider} (${f.financing_type}) — ${money(f.amount)}`}
          fields={[
            { key: "provider", label: "Provider" },
            { key: "financing_type", label: "Type" },
            { key: "amount", label: "Amount", type: "number" },
          ]}
          onSubmit={(body) => post("/api/ledger/financing", body)}
          empty="No financing recorded for this contract."
        />
      )}

      {tab === "Invoicing" && (
        <Section
          title="Invoices"
          items={invoices}
          renderItem={(i) => (
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {i.invoice_number} — {money(i.amount)}
                {i.gst_hst_amount ? ` (+${money(i.gst_hst_amount)} GST/HST)` : ""} [{i.paid_status || ""}]
              </span>
              <Link
                href={`/print/invoice/${i.id}`}
                target="_blank"
                className="text-xs font-semibold text-abiric-salmon hover:text-abiric-salmonLight"
              >
                Print →
              </Link>
            </span>
          )}
          fields={[
            { key: "invoice_number", label: "Invoice #" },
            { key: "customer_name", label: "Customer (optional, defaults to client)" },
            { key: "amount", label: "Amount", type: "number" },
            { key: "gst_hst_amount", label: "GST/HST", type: "number" },
            { key: "due_date", label: "Due date (YYYY-MM-DD)" },
          ]}
          onSubmit={(body) => post("/api/ledger/invoices", body)}
          empty="No invoices issued yet."
        />
      )}

      {tab === "Payments" && (
        <Section
          title="Payments"
          items={payments}
          renderItem={(p) => `${p.direction} — ${money(p.amount)} (${p.method || "n/a"})`}
          fields={[
            { key: "direction", label: "Direction (inbound/outbound)" },
            { key: "amount", label: "Amount", type: "number" },
            { key: "method", label: "Method" },
          ]}
          onSubmit={(body) => post("/api/ledger/payments", body)}
          empty="No payments recorded yet."
        />
      )}

      {tab === "Profitability" && summary && <ProfitabilityTab summary={summary} />}
    </div>
  );
}

function OverviewTab({ contract, summary, taxPct, setTaxPct, onSaveTax }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Invoiced" value={money(summary.totals.invoiced)} />
        <Stat label="Collected" value={money(summary.totals.paidIn)} />
        <Stat label="Outstanding" value={money(summary.totals.outstandingReceivable)} />
        <Stat label="Total cost" value={money(summary.totals.totalCost)} />
        <Stat label="Gross profit" value={money(summary.grossBeforeTax)} highlight />
        <Stat label="Tax reserve" value={money(summary.taxReserve)} />
        <Stat label="Net after reserve" value={money(summary.netAfterTaxReserve)} highlight />
      </div>

      <div className="abiric-card flex items-center gap-3">
        <label className="text-xs font-semibold text-abiric-muted">Tax reserve %</label>
        <input
          type="number"
          step="0.01"
          value={taxPct}
          onChange={(e) => setTaxPct(e.target.value)}
          className="w-24 rounded-lg border border-white/10 bg-abiric-charcoal px-2 py-1 text-sm text-abiric-cream"
        />
        <button onClick={onSaveTax} className="abiric-button-secondary text-xs">Save</button>
      </div>

      <div className="abiric-card">
        <p className="abiric-label">Contract Information</p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Contract #" value={contract.contract_number} />
          <Field label="Line" value={contract.line} />
          <Field label="Client" value={contract.client_name || "—"} />
          <Field label="Status" value={contract.status} />
          <Field label="Notes" value={contract.notes || "—"} />
        </dl>
      </div>
    </div>
  );
}

function ProfitabilityTab({ summary }) {
  return (
    <div className="abiric-card grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Field label="Quoted amount" value={money(summary.totals.quotedAmount)} />
      <Field label="Purchase cost" value={money(summary.totals.purchaseCost)} />
      <Field label="Direct expenses" value={money(summary.totals.directExpenses)} />
      <Field label="Financing" value={money(summary.totals.financing)} />
      <Field label="Total cost" value={money(summary.totals.totalCost)} />
      <Field label="Invoiced" value={money(summary.totals.invoiced)} />
      <Field label="Paid in" value={money(summary.totals.paidIn)} />
      <Field label="Paid out" value={money(summary.totals.paidOut)} />
      <Field label="Outstanding receivable" value={money(summary.totals.outstandingReceivable)} />
      <Field label="Gross before tax" value={money(summary.grossBeforeTax)} />
      <Field label={`Tax reserve (${summary.taxReservePercent}%)`} value={money(summary.taxReserve)} />
      <Field label="Net after reserve" value={money(summary.netAfterTaxReserve)} />
    </div>
  );
}

function DeliveryTab({ lots, onRecorded }) {
  if (lots.length === 0) {
    return <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-abiric-muted">No purchase lots to deliver yet — add one under Purchasing first.</p>;
  }
  return (
    <div className="space-y-3">
      {lots.map((lot) => (
        <div key={lot.id} className="abiric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-abiric-cream">{lot.supplier_name}</p>
              <p className="text-xs text-abiric-muted">{lot.quantity} {lot.unit || ""} ordered · status: {lot.delivery_status}</p>
            </div>
          </div>
          <DeliveryForm lotId={lot.id} onDone={onRecorded} />
        </div>
      ))}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-abiric-muted">{label}</dt>
      <dd className="mt-0.5 text-abiric-cream">{value}</dd>
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

function Section({ title, items, renderItem, fields, onSubmit, empty, extra }) {
  const [form, setForm] = useState({});
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-abiric-muted">{title}</h2>
        <button onClick={() => setOpen(!open)} className="abiric-button-secondary text-xs">
          {open ? "Close" : "+ Add"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
            setForm({});
            setOpen(false);
          }}
          className="abiric-card mb-4 grid grid-cols-2 gap-2"
        >
          {fields.map((f) => (
            <input
              key={f.key}
              type={f.type || "text"}
              placeholder={f.label}
              value={form[f.key] || ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className="rounded-lg border border-white/10 bg-abiric-charcoal px-2.5 py-1.5 text-xs text-abiric-cream"
            />
          ))}
          <button type="submit" className="abiric-button col-span-2 text-xs">Save</button>
        </form>
      )}

      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-white/[0.07] bg-abiric-charcoal px-3 py-2 text-abiric-cream">
            {renderItem(item)}
            {extra && extra(item)}
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-abiric-muted">{empty}</li>
        )}
      </ul>
    </div>
  );
}

function DeliveryForm({ lotId, onDone }) {
  const [qty, setQty] = useState("");
  async function submit(e) {
    e.preventDefault();
    await fetch(`/api/ledger/lots/${lotId}/deliveries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delivered_quantity: Number(qty) }),
    });
    setQty("");
    onDone();
  }
  return (
    <form onSubmit={submit} className="mt-3 flex gap-2">
      <input
        required
        type="number"
        step="0.001"
        placeholder="Delivered qty"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        className="w-32 rounded-lg border border-white/10 bg-abiric-charcoal px-2 py-1 text-xs text-abiric-cream"
      />
      <button type="submit" className="abiric-button-secondary text-xs">Record delivery</button>
    </form>
  );
}
