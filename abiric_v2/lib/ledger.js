// Pure functions only — no DB, no network, no AI calls.
// This is the entire "math" surface of the ledger. Deliberately
// isolated so it can be unit-tested and so nothing here ever
// depends on an AI call for a number.

export function sum(rows, field) {
  return rows.reduce((total, r) => total + Number(r[field] || 0), 0);
}

// Straight sum of actual recorded lot costs. No averaging, no
// re-derivation from quantity * unit cost — actual_total_cost is
// the value entered at purchase time and is trusted as-is, since
// unit cost can include freight/duties not reducible to qty*unit.
export function totalPurchaseCost(lots) {
  return sum(lots, "actual_total_cost");
}

export function totalDirectExpenses(expenses) {
  return sum(expenses, "amount");
}

export function totalFinancing(financingRows) {
  return sum(financingRows, "amount");
}

export function totalInvoiced(invoices) {
  return sum(invoices, "amount");
}

export function totalPayments(payments, direction) {
  return sum(payments.filter((p) => p.direction === direction), "amount");
}

// Delivery status for a lot, derived from its delivery events —
// never stored as a mutable flag that could drift from history.
export function lotDeliveryStatus(lot, deliveries) {
  const delivered = sum(
    deliveries.filter((d) => d.lot_id === lot.id),
    "delivered_quantity"
  );
  if (delivered <= 0) return "pending";
  if (delivered >= Number(lot.quantity)) return "received";
  return "partial";
}

// Per-invoice paid status, derived from linked payments rather
// than a mutated invoice.status column.
export function invoicePaidStatus(invoice, payments) {
  const paid = sum(
    payments.filter((p) => p.invoice_id === invoice.id && p.direction === "inbound"),
    "amount"
  );
  if (paid <= 0) return "unpaid";
  if (paid >= Number(invoice.amount)) return "paid";
  return "partially_paid";
}

// Full contract rollup. No overhead allocation anywhere: cost is
// purchase lots + direct expenses + financing, summed directly.
export function contractSummary({ contract, quotes, lots, expenses, financingRows, invoices, payments, deliveries }) {
  const totalCost = totalPurchaseCost(lots) + totalDirectExpenses(expenses) + totalFinancing(financingRows);
  const invoicedTotal = totalInvoiced(invoices);
  const paidIn = totalPayments(payments, "inbound");
  const paidOut = totalPayments(payments, "outbound");

  const grossBeforeTax = invoicedTotal - totalCost;
  const taxReservePercent = Number(contract.tax_reserve_percent ?? 15);
  const taxReserve = invoicedTotal * (taxReservePercent / 100);
  const netAfterTaxReserve = grossBeforeTax - taxReserve;

  return {
    contractId: contract.id,
    contractNumber: contract.contract_number,
    line: contract.line,
    totals: {
      quotedAmount: sum(quotes, "quoted_amount"),
      purchaseCost: totalPurchaseCost(lots),
      directExpenses: totalDirectExpenses(expenses),
      financing: totalFinancing(financingRows),
      totalCost,
      invoiced: invoicedTotal,
      paidIn,
      paidOut,
      outstandingReceivable: invoicedTotal - paidIn,
    },
    taxReservePercent,
    taxReserve,
    grossBeforeTax,
    netAfterTaxReserve,
    lots: lots.map((l) => ({ ...l, delivery_status: lotDeliveryStatus(l, deliveries) })),
    invoices: invoices.map((i) => ({ ...i, paid_status: invoicePaidStatus(i, payments) })),
  };
}
