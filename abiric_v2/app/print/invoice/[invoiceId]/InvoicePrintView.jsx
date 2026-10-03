"use client";

import AbiricLetterhead from "@/components/AbiricLetterhead";

const money = (n) => Number(n || 0).toLocaleString("en-CA", { style: "currency", currency: "CAD" });

const STATUS_LABEL = {
  paid: "PAID IN FULL",
  partially_paid: "PARTIALLY PAID",
  unpaid: "UNPAID",
};

export default function InvoicePrintView({ invoice, contract, payments, company }) {
  const subtotal = Number(invoice.amount) - Number(invoice.gst_hst_amount || 0);
  const gstHst = Number(invoice.gst_hst_amount || 0);
  const total = Number(invoice.amount);
  const paidToDate = payments.filter((p) => p.direction === "inbound").reduce((a, p) => a + Number(p.amount), 0);
  const balanceDue = total - paidToDate;

  return (
    <div className="bg-white text-[#101312] shadow-xl print:shadow-none">
      <div className="p-10 print:p-8">
        <AbiricLetterhead company={company} />

        <div className="mt-8 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F28C82]">Invoice</p>
            <h1 className="mt-1 text-2xl font-bold">{invoice.invoice_number}</h1>
            <p className="mt-2 text-sm text-[#4b564f]">
              Contract: {contract?.contract_number || "—"} — {contract?.title || ""}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="text-[#4b564f]">Invoice date: <span className="font-medium text-[#101312]">{invoice.invoice_date}</span></p>
            {invoice.due_date && <p className="text-[#4b564f]">Due date: <span className="font-medium text-[#101312]">{invoice.due_date}</span></p>}
            <p className={`mt-2 inline-block rounded-full border px-3 py-1 text-[10px] font-bold tracking-wide ${
              invoice.paid_status === "paid" ? "border-[#245447] bg-[#245447]/10 text-[#173D32]" : "border-[#F28C82] bg-[#F28C82]/10 text-[#D96F66]"
            }`}>
              {STATUS_LABEL[invoice.paid_status] || invoice.paid_status}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-[#e2e2dc] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4b564f]">Bill To</p>
          <p className="mt-1 font-semibold">{invoice.customer_name || contract?.client_name || "—"}</p>
        </div>

        <table className="mt-8 w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-[#173D32] text-[11px] uppercase tracking-wide text-[#4b564f]">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#e2e2dc]">
              <td className="py-3">
                Services / goods per contract {contract?.contract_number || ""}
                {contract?.title ? ` — ${contract.title}` : ""}
              </td>
              <td className="py-3 text-right">{money(subtotal)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[#4b564f]">Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-[#4b564f]">GST/HST</span><span>{money(gstHst)}</span></div>
            <div className="flex justify-between border-t border-[#e2e2dc] pt-2 text-base font-bold"><span>Total</span><span>{money(total)}</span></div>
            {paidToDate > 0 && (
              <>
                <div className="flex justify-between text-[#245447]"><span>Paid to date</span><span>-{money(paidToDate)}</span></div>
                <div className="flex justify-between border-t border-[#e2e2dc] pt-2 text-base font-bold">
                  <span>Balance due</span><span>{money(balanceDue)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {payments.length > 0 && (
          <div className="mt-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4b564f]">Payment History</p>
            <table className="mt-2 w-full text-left text-xs">
              <tbody>
                {payments.filter((p) => p.direction === "inbound").map((p) => (
                  <tr key={p.id} className="border-b border-[#e2e2dc]">
                    <td className="py-1.5 text-[#4b564f]">{p.payment_date}</td>
                    <td className="py-1.5 text-[#4b564f]">{p.method || "—"}</td>
                    <td className="py-1.5 text-right">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-12 border-t border-[#e2e2dc] pt-4 text-[10px] text-[#9aa39d]">
          <p>This document reflects transaction records held in ABIRIC's internal operating system and is not a substitute for a statutory tax filing.</p>
        </div>
      </div>

      <div className="flex justify-center gap-3 p-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-[#F28C82] px-6 py-2.5 text-sm font-bold text-[#101312] transition hover:bg-[#F7AAA2]"
        >
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
