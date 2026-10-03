// Relative import (not the @/ alias) so this module can be exercised by a
// plain `node scripts/test-monthly-statement.mjs` outside Next's bundler,
// same pattern lib/ledger.js already uses for its own test script.
import { sum, invoicePaidStatus } from "./ledger.js";

export function monthBounds(monthStr) {
  // monthStr like "2026-10"
  const [year, month] = monthStr.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0)); // last day of month
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

export async function getMonthlyStatement(db, monthStr) {
  const { start, end } = monthBounds(monthStr);

  const [
    { data: invoicesThisMonth },
    { data: expensesThisMonth },
    { data: paymentsThisMonth },
    { data: allInvoicesToDate },
    { data: allPaymentsToDate },
    { data: contracts },
  ] = await Promise.all([
    db.from("invoices").select("*").gte("invoice_date", start).lte("invoice_date", end),
    db.from("direct_expenses").select("*").gte("expense_date", start).lte("expense_date", end),
    db.from("payments").select("*").gte("payment_date", start).lte("payment_date", end),
    // Cumulative, not period-scoped — needed for the AR snapshot "as of"
    // period end: any invoice issued on or before this month, and every
    // payment made on or before this month, regardless of which month the
    // invoice itself was issued in.
    db.from("invoices").select("*").lte("invoice_date", end),
    db.from("payments").select("*").lte("payment_date", end).eq("direction", "inbound"),
    db.from("contracts").select("id, contract_number, client_name"),
  ]);

  const contractMap = new Map((contracts || []).map((c) => [c.id, c]));
  const label = (contractId) => {
    const c = contractMap.get(contractId);
    return c ? `${c.contract_number} — ${c.client_name || "No client"}` : "—";
  };

  const invoiced = {
    total: sum(invoicesThisMonth || [], "amount"),
    gstHst: sum(invoicesThisMonth || [], "gst_hst_amount"),
    items: (invoicesThisMonth || []).map((i) => ({
      id: i.id,
      invoiceNumber: i.invoice_number,
      contract: label(i.contract_id),
      date: i.invoice_date,
      amount: Number(i.amount),
      gstHst: Number(i.gst_hst_amount || 0),
    })),
  };

  const expenses = {
    total: sum(expensesThisMonth || [], "amount"),
    gstHst: sum(expensesThisMonth || [], "gst_hst_amount"),
    items: (expensesThisMonth || []).map((e) => ({
      id: e.id,
      contract: label(e.contract_id),
      date: e.expense_date,
      category: e.category,
      payee: e.payee || "",
      amount: Number(e.amount),
      gstHst: Number(e.gst_hst_amount || 0),
    })),
  };

  const cashIn = (paymentsThisMonth || []).filter((p) => p.direction === "inbound");
  const cashOut = (paymentsThisMonth || []).filter((p) => p.direction === "outbound");

  const cashReceived = {
    total: sum(cashIn, "amount"),
    items: cashIn.map((p) => ({ id: p.id, contract: label(p.contract_id), date: p.payment_date, amount: Number(p.amount), method: p.method })),
  };

  const cashPaidOut = {
    total: sum(cashOut, "amount"),
    items: cashOut.map((p) => ({ id: p.id, contract: label(p.contract_id), date: p.payment_date, amount: Number(p.amount), method: p.method })),
  };

  // AR snapshot as of period end — every invoice issued by this date,
  // its paid status derived from payments made by this date (not just
  // payments within the month), so "outstanding" is a true point-in-time
  // balance, not confused with this month's activity.
  const receivablesSnapshot = (allInvoicesToDate || []).map((inv) => {
    const relevantPayments = (allPaymentsToDate || []).filter((p) => p.invoice_id === inv.id);
    const paid = sum(relevantPayments, "amount");
    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      contract: label(inv.contract_id),
      invoiceDate: inv.invoice_date,
      total: Number(inv.amount),
      paid,
      outstanding: Number(inv.amount) - paid,
      status: invoicePaidStatus(inv, relevantPayments),
    };
  });

  const outstandingReceivables = receivablesSnapshot.filter((r) => r.outstanding > 0.005);

  return {
    period: { month: monthStr, start, end },
    invoiced,
    expenses,
    cashReceived,
    cashPaidOut,
    gstPosition: { collected: invoiced.gstHst, paid: expenses.gstHst, net: invoiced.gstHst - expenses.gstHst },
    receivablesAsOfPeriodEnd: {
      total: sum(outstandingReceivables, "outstanding"),
      items: outstandingReceivables,
    },
  };
}
