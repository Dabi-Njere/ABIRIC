"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { downloadCsv } from "@/lib/csv";

const money = (n) =>
  Number(n || 0).toLocaleString("en-CA", { style: "currency", currency: "CAD" });

export default function AccountingPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expenseFilter, setExpenseFilter] = useState({ contract: "", category: "" });

  useEffect(() => {
    fetch("/api/ledger/accounting-summary")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message || "Failed to load accounting data."))
      .finally(() => setLoading(false));
  }, []);

  const filteredExpenses = useMemo(() => {
    if (!data) return [];
    return data.expenseRegister.filter((e) => {
      if (expenseFilter.contract && e.contractNumber !== expenseFilter.contract) return false;
      if (expenseFilter.category && e.category !== expenseFilter.category) return false;
      return true;
    });
  }, [data, expenseFilter]);

  if (loading) return <p className="text-abiric-muted text-sm">Loading accounting data…</p>;
  if (error) return <p className="text-red-300 text-sm">{error}</p>;
  if (!data) return null;

  const { financialSummary: fs, gstSummary: gst, contractProfitability, receivables } = data;
  const contractNumbers = [...new Set(data.expenseRegister.map((e) => e.contractNumber).filter(Boolean))];
  const categories = [...new Set(data.expenseRegister.map((e) => e.category).filter(Boolean))];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="abiric-eyebrow">Financial Reporting</p>
          <h1 className="text-2xl font-bold text-abiric-cream">Accounting</h1>
          <p className="mt-1 text-sm text-abiric-muted">
            Aggregated directly from contract ledger transactions — not a separate set of books.
          </p>
        </div>
        <Link href="/print/statement" target="_blank" className="abiric-button-secondary">
          Monthly Statement (PDF)
        </Link>
      </div>

      {/* FINANCIAL SUMMARY */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-abiric-muted">Financial Summary</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Revenue (invoiced)" value={money(fs.revenueTotal)} />
          <Stat label="Cash collected" value={money(fs.paidInTotal)} />
          <Stat label="Accounts receivable" value={money(fs.accountsReceivable)} />
          <Stat label="Purchases / COGS" value={money(fs.purchaseCostTotal)} />
          <Stat label="Direct expenses" value={money(fs.directExpenseTotal)} />
          <Stat label="Financing cost" value={money(fs.financingTotal)} />
          <Stat label="Gross profit" value={money(fs.grossProfitTotal)} highlight />
          <Stat label="Net contract contribution" value={money(fs.netContractContribution)} highlight />
        </div>
      </section>

      {/* GST/HST SUMMARY */}
      <section className="abiric-card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-abiric-muted">GST/HST Summary</h2>
        <p className="mt-1 text-xs text-abiric-muted">
          This is not tax-filing software. Figures reflect only transactions where GST/HST was
          explicitly entered — nothing here is estimated from totals.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="GST/HST collected (sales)" value={money(gst.gstCollected)} />
          <Stat label="GST/HST paid (purchases)" value={money(gst.gstPaid)} />
          <Stat label="Estimated net position" value={money(gst.gstNetPosition)} highlight />
        </div>
        {!gst.hasAnyGstData && (
          <p className="mt-3 text-xs text-amber-400">
            No GST/HST has been entered on any invoice or expense yet — enter it going forward for
            this to populate.
          </p>
        )}
      </section>

      {/* CONTRACT PROFITABILITY */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-abiric-muted">Contract Profitability</h2>
          <button
            onClick={() => downloadCsv("contract-profitability.csv", contractProfitability)}
            className="text-xs font-semibold text-abiric-salmon hover:text-abiric-salmonLight"
          >
            Export CSV
          </button>
        </div>
        <Table
          columns={["Contract", "Title", "Revenue", "Purchase Cost", "Direct Exp.", "Financing", "Gross Profit", "Margin %"]}
          rows={contractProfitability.map((c) => [
            <Link key={c.contractId} href={`/dashboard/ledger/${c.contractId}`} className="text-abiric-salmon hover:underline">
              {c.contractNumber}
            </Link>,
            c.title,
            money(c.revenue),
            money(c.purchaseCost),
            money(c.directExpenses),
            money(c.financing),
            money(c.grossProfit),
            c.marginPercent !== null ? `${c.marginPercent.toFixed(1)}%` : "—",
          ])}
          empty="No contracts yet."
        />
      </section>

      {/* RECEIVABLES */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-abiric-muted">Receivables</h2>
          <button
            onClick={() => downloadCsv("receivables.csv", receivables)}
            className="text-xs font-semibold text-abiric-salmon hover:text-abiric-salmonLight"
          >
            Export CSV
          </button>
        </div>
        <Table
          columns={["Invoice", "Contract", "Client", "Invoice Date", "Due", "Total", "Paid", "Outstanding", "Status", ""]}
          rows={receivables.map((r) => [
            r.invoiceNumber,
            r.contractNumber,
            r.customer,
            r.invoiceDate,
            r.dueDate || "—",
            money(r.total),
            money(r.paid),
            money(r.outstanding),
            <StatusBadge key={r.id} status={r.status} />,
            <Link key={`print-${r.id}`} href={`/print/invoice/${r.id}`} target="_blank" className="text-abiric-salmon hover:text-abiric-salmonLight">
              Print
            </Link>,
          ])}
          empty="No invoices yet."
        />
      </section>

      {/* EXPENSE REGISTER */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-abiric-muted">Expense Register</h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={expenseFilter.contract}
              onChange={(e) => setExpenseFilter({ ...expenseFilter, contract: e.target.value })}
              className="rounded-lg border border-white/10 bg-abiric-charcoal px-2 py-1.5 text-xs text-abiric-cream"
            >
              <option value="">All contracts</option>
              {contractNumbers.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={expenseFilter.category}
              onChange={(e) => setExpenseFilter({ ...expenseFilter, category: e.target.value })}
              className="rounded-lg border border-white/10 bg-abiric-charcoal px-2 py-1.5 text-xs text-abiric-cream"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              onClick={() => downloadCsv("expense-register.csv", filteredExpenses)}
              className="text-xs font-semibold text-abiric-salmon hover:text-abiric-salmonLight"
            >
              Export CSV
            </button>
          </div>
        </div>
        <Table
          columns={["Contract", "Date", "Category", "Payee", "Description", "Subtotal", "GST/HST", "Total", "Status"]}
          rows={filteredExpenses.map((e) => [
            e.contractNumber,
            e.date,
            e.category,
            e.payee || "—",
            e.description || "—",
            money(e.amount),
            money(e.gstHst),
            money(e.total),
            e.paymentStatus,
          ])}
          empty="No expenses recorded yet."
        />
      </section>
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

function Table({ columns, rows, empty }) {
  if (rows.length === 0) {
    return <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-abiric-muted">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
      <table className="w-full text-left text-xs">
        <thead className="bg-abiric-charcoal">
          <tr>
            {columns.map((c) => (
              <th key={c} className="abiric-th px-3 py-2">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {rows.map((row, i) => (
            <tr key={i} className="text-abiric-cream hover:bg-white/[0.02]">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    paid: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
    partially_paid: "bg-abiric-salmon/10 text-abiric-salmon border-abiric-salmon/25",
    unpaid: "bg-white/5 text-abiric-muted border-white/10",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[status] || styles.unpaid}`}>
      {status.replace("_", " ")}
    </span>
  );
}
