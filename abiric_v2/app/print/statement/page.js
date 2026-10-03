"use client";

import { useEffect, useState } from "react";
import AbiricLetterhead from "@/components/AbiricLetterhead";

const money = (n) => Number(n || 0).toLocaleString("en-CA", { style: "currency", currency: "CAD" });

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function MonthlyStatementPage() {
  const [month, setMonth] = useState(currentMonth());
  const [statement, setStatement] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/company").then((r) => r.json()).then((d) => setCompany(d.company || null));
  }, []);

  useEffect(() => {
    setStatement(null);
    setError("");
    fetch(`/api/ledger/monthly-statement?month=${month}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setStatement(d.statement)))
      .catch((e) => setError(e.message));
  }, [month]);

  return (
    <div className="bg-white text-[#101312] shadow-xl print:shadow-none">
      <div className="flex items-center justify-between gap-3 p-4 print:hidden">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-[#d8d8d2] px-3 py-2 text-sm"
        />
        <button
          onClick={() => window.print()}
          disabled={!statement}
          className="rounded-xl bg-[#F28C82] px-6 py-2.5 text-sm font-bold text-[#101312] transition hover:bg-[#F7AAA2] disabled:opacity-50"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="p-10 print:p-8">
        <AbiricLetterhead company={company} />

        <div className="mt-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F28C82]">Monthly Statement</p>
          <h1 className="mt-1 text-2xl font-bold">
            {statement ? new Date(statement.period.start + "T00:00:00").toLocaleDateString("en-CA", { month: "long", year: "numeric" }) : month}
          </h1>
        </div>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
        {!statement && !error && <p className="mt-6 text-sm text-[#4b564f]">Loading…</p>}

        {statement && (
          <div className="mt-8 space-y-8">
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Invoiced" value={money(statement.invoiced.total)} />
              <Stat label="Cash received" value={money(statement.cashReceived.total)} />
              <Stat label="Expenses" value={money(statement.expenses.total)} />
              <Stat label="Cash paid out" value={money(statement.cashPaidOut.total)} />
            </section>

            <Section title="Invoices Issued This Month">
              <Table
                columns={["Invoice #", "Contract", "Date", "Amount", "GST/HST"]}
                rows={statement.invoiced.items.map((i) => [i.invoiceNumber, i.contract, i.date, money(i.amount), money(i.gstHst)])}
                empty="No invoices issued this month."
              />
            </Section>

            <Section title="Cash Received This Month">
              <Table
                columns={["Date", "Contract", "Method", "Amount"]}
                rows={statement.cashReceived.items.map((p) => [p.date, p.contract, p.method || "—", money(p.amount)])}
                empty="No payments received this month."
              />
            </Section>

            <Section title="Expenses This Month">
              <Table
                columns={["Date", "Contract", "Category", "Payee", "Amount", "GST/HST"]}
                rows={statement.expenses.items.map((e) => [e.date, e.contract, e.category, e.payee || "—", money(e.amount), money(e.gstHst)])}
                empty="No expenses recorded this month."
              />
            </Section>

            <Section title="Cash Paid Out This Month (supplier / financing)">
              <Table
                columns={["Date", "Contract", "Method", "Amount"]}
                rows={statement.cashPaidOut.items.map((p) => [p.date, p.contract, p.method || "—", money(p.amount)])}
                empty="No outbound payments this month."
              />
            </Section>

            <Section title={`Outstanding Receivables as of ${statement.period.end}`}>
              <p className="mb-2 text-xs text-[#4b564f]">
                All unpaid or partially paid invoices as of this date, regardless of which month they
                were issued in — this is a point-in-time balance, not limited to this month's activity.
              </p>
              <Table
                columns={["Invoice #", "Contract", "Invoice Date", "Total", "Paid", "Outstanding", "Status"]}
                rows={statement.receivablesAsOfPeriodEnd.items.map((r) => [
                  r.invoiceNumber, r.contract, r.invoiceDate, money(r.total), money(r.paid), money(r.outstanding), r.status.replace("_", " "),
                ])}
                empty="No outstanding receivables as of this date."
              />
              <p className="mt-2 text-right text-sm font-bold">
                Total outstanding: {money(statement.receivablesAsOfPeriodEnd.total)}
              </p>
            </Section>

            <Section title="GST/HST Position (this month, explicitly recorded only)">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><p className="text-[#4b564f]">Collected</p><p className="font-bold">{money(statement.gstPosition.collected)}</p></div>
                <div><p className="text-[#4b564f]">Paid</p><p className="font-bold">{money(statement.gstPosition.paid)}</p></div>
                <div><p className="text-[#4b564f]">Net position</p><p className="font-bold">{money(statement.gstPosition.net)}</p></div>
              </div>
            </Section>

            <div className="border-t border-[#e2e2dc] pt-4 text-[10px] text-[#9aa39d]">
              <p>
                This statement reflects transaction records held in ABIRIC's internal operating system
                as of generation time and is not a substitute for a statutory tax filing or professional
                accounting review. GST/HST figures reflect only amounts explicitly recorded on invoices
                and expenses.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-[#e2e2dc] p-3">
      <p className="text-[10px] uppercase tracking-wide text-[#4b564f]">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-2 border-b border-[#173D32] pb-1 text-sm font-bold uppercase tracking-wide text-[#173D32]">{title}</h2>
      {children}
    </section>
  );
}

function Table({ columns, rows, empty }) {
  if (rows.length === 0) return <p className="text-xs text-[#9aa39d]">{empty}</p>;
  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="border-b border-[#e2e2dc] text-[#4b564f]">
          {columns.map((c) => <th key={c} className="py-1.5 pr-3 font-semibold uppercase tracking-wide">{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-[#f0f0ec]">
            {row.map((cell, j) => <td key={j} className="py-1.5 pr-3">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
