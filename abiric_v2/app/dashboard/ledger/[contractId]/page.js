"use client";

import { useEffect, useState } from "react";

const fmt = (n) => `$${Number(n || 0).toLocaleString("en-CA", { minimumFractionDigits: 2 })}`;

export default function ContractLedgerPage({ params }) {
  const { contractId } = params;
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

  if (!contract) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">
          {contract.contract_number} — {contract.title}
        </h2>
        <p className="text-xs uppercase text-gray-400">{contract.line} · {contract.status}</p>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-3 bg-abiric-forestDark/40 border border-gray-800 rounded p-4 text-sm">
          <div>Quoted: {fmt(summary.totals.quotedAmount)}</div>
          <div>Purchase cost (actual): {fmt(summary.totals.purchaseCost)}</div>
          <div>Direct expenses: {fmt(summary.totals.directExpenses)}</div>
          <div>Financing: {fmt(summary.totals.financing)}</div>
          <div className="font-semibold">Total cost: {fmt(summary.totals.totalCost)}</div>
          <div>Invoiced: {fmt(summary.totals.invoiced)}</div>
          <div>Paid in: {fmt(summary.totals.paidIn)}</div>
          <div>Paid out: {fmt(summary.totals.paidOut)}</div>
          <div>Outstanding receivable: {fmt(summary.totals.outstandingReceivable)}</div>
          <div>Gross before tax: {fmt(summary.grossBeforeTax)}</div>
          <div>Tax reserve ({summary.taxReservePercent}%): {fmt(summary.taxReserve)}</div>
          <div className="font-semibold text-abiric-accentLight">
            Net after tax reserve: {fmt(summary.netAfterTaxReserve)}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <label>Tax reserve %:</label>
        <input
          type="number"
          step="0.01"
          value={taxPct}
          onChange={(e) => setTaxPct(e.target.value)}
          className="w-24 px-2 py-1 rounded bg-black/40 border border-gray-700"
        />
        <button onClick={saveTaxPct} className="px-3 py-1 rounded bg-abiric-accent hover:bg-abiric-accentLight">
          Save
        </button>
      </div>

      <Section
        title="Supplier Quotes"
        items={quotes}
        renderItem={(q) => `${q.supplier_name} — ${fmt(q.quoted_amount)} (${q.status})`}
        fields={[
          { key: "supplier_name", label: "Supplier" },
          { key: "quoted_amount", label: "Amount", type: "number" },
        ]}
        onSubmit={(body) => post("/api/ledger/quotes", body)}
      />

      <Section
        title="Purchase Lots (actual cost)"
        items={lots}
        renderItem={(l) => `${l.supplier_name} — ${l.quantity} ${l.unit || ""} @ ${fmt(l.actual_unit_cost)}/u = ${fmt(l.actual_total_cost)} [${l.delivery_status}]`}
        fields={[
          { key: "supplier_name", label: "Supplier" },
          { key: "quantity", label: "Quantity", type: "number" },
          { key: "unit", label: "Unit" },
          { key: "actual_total_cost", label: "Actual total cost", type: "number" },
        ]}
        onSubmit={(body) => post("/api/ledger/lots", body)}
        extra={(lot) => <DeliveryForm lotId={lot.id} onDone={loadAll} />}
      />

      <Section
        title="Direct Expenses"
        items={expenses}
        renderItem={(e) => `${e.category} — ${fmt(e.amount)}`}
        fields={[
          { key: "category", label: "Category" },
          { key: "amount", label: "Amount", type: "number" },
        ]}
        onSubmit={(body) => post("/api/ledger/expenses", body)}
      />

      <Section
        title="Financing"
        items={financingRows}
        renderItem={(f) => `${f.provider} (${f.financing_type}) — ${fmt(f.amount)}`}
        fields={[
          { key: "provider", label: "Provider" },
          { key: "financing_type", label: "Type" },
          { key: "amount", label: "Amount", type: "number" },
        ]}
        onSubmit={(body) => post("/api/ledger/financing", body)}
      />

      <Section
        title="Invoices"
        items={invoices}
        renderItem={(i) => `${i.invoice_number} — ${fmt(i.amount)} [${i.paid_status || ""}]`}
        fields={[
          { key: "invoice_number", label: "Invoice #" },
          { key: "amount", label: "Amount", type: "number" },
        ]}
        onSubmit={(body) => post("/api/ledger/invoices", body)}
      />

      <Section
        title="Payments"
        items={payments}
        renderItem={(p) => `${p.direction} — ${fmt(p.amount)} (${p.method || "n/a"})`}
        fields={[
          { key: "direction", label: "Direction (inbound/outbound)" },
          { key: "amount", label: "Amount", type: "number" },
          { key: "method", label: "Method" },
        ]}
        onSubmit={(body) => post("/api/ledger/payments", body)}
      />
    </div>
  );
}

function Section({ title, items, renderItem, fields, onSubmit, extra }) {
  const [form, setForm] = useState({});
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        <button onClick={() => setOpen(!open)} className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">
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
          className="grid grid-cols-2 gap-2 mb-3 bg-abiric-forestDark/30 border border-gray-800 rounded p-3"
        >
          {fields.map((f) => (
            <input
              key={f.key}
              required
              type={f.type || "text"}
              placeholder={f.label}
              value={form[f.key] || ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className="px-2 py-1 rounded bg-black/40 border border-gray-700 text-sm"
            />
          ))}
          <button type="submit" className="col-span-2 py-1 rounded bg-abiric-accent hover:bg-abiric-accentLight text-sm">
            Save
          </button>
        </form>
      )}

      <ul className="text-sm space-y-1">
        {items.map((item) => (
          <li key={item.id} className="border border-gray-800 rounded px-3 py-2 bg-abiric-forestDark/20">
            {renderItem(item)}
            {extra && extra(item)}
          </li>
        ))}
        {items.length === 0 && <li className="text-gray-500 text-xs">None yet.</li>}
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
    <form onSubmit={submit} className="flex gap-2 mt-2">
      <input
        required
        type="number"
        step="0.001"
        placeholder="Delivered qty"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        className="w-32 px-2 py-1 rounded bg-black/40 border border-gray-700 text-xs"
      />
      <button type="submit" className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">
        Record delivery
      </button>
    </form>
  );
}
