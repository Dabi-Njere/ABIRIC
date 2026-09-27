// Plain Node script (no test framework dependency) exercising the
// full ledger rollup end-to-end against representative data:
// two purchase lots at different actual costs (no averaging),
// a partial delivery, direct expenses, financing, an invoice with
// a partial payment, and a non-default tax reserve percentage.
//
// Run with: node scripts/test-ledger.mjs

import { contractSummary, lotDeliveryStatus, invoicePaidStatus } from "../lib/ledger.js";

function assertEqual(actual, expected, label) {
  if (Math.abs(actual - expected) > 0.001) {
    console.error(`FAIL: ${label} — expected ${expected}, got ${actual}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${label} (${actual})`);
  }
}

const contract = { id: "c1", contract_number: "ABI-2026-001", line: "procurement", tax_reserve_percent: 12 };

const quotes = [
  { id: "q1", quoted_amount: 10000 },
  { id: "q2", quoted_amount: 4200 },
];

// Two lots at genuinely different actual unit costs — the point of
// "actual cost, not weighted average" is that these stay distinct.
const lots = [
  { id: "l1", quantity: 100, unit: "unit", actual_unit_cost: 92.5, actual_total_cost: 9250 },
  { id: "l2", quantity: 50, unit: "unit", actual_unit_cost: 88.0, actual_total_cost: 4400 },
];

const deliveries = [
  { lot_id: "l1", delivered_quantity: 60 }, // partial delivery on l1
];

const expenses = [
  { amount: 500 }, // freight
  { amount: 150 }, // customs
];

const financingRows = [{ amount: 1000, interest_rate: 5 }];

const invoices = [{ id: "inv1", amount: 20000 }];

const payments = [
  { invoice_id: "inv1", direction: "inbound", amount: 12000 }, // partial payment
  { direction: "outbound", amount: 4400 }, // paid a supplier
];

const summary = contractSummary({ contract, quotes, lots, expenses, financingRows, invoices, payments, deliveries });

console.log(JSON.stringify(summary, null, 2));

assertEqual(summary.totals.quotedAmount, 14200, "total quoted amount");
assertEqual(summary.totals.purchaseCost, 13650, "purchase cost = sum of ACTUAL lot costs (9250 + 4400), not averaged");
assertEqual(summary.totals.directExpenses, 650, "direct expenses");
assertEqual(summary.totals.financing, 1000, "financing");
assertEqual(summary.totals.totalCost, 15300, "total cost — no overhead allocation, straight sum");
assertEqual(summary.totals.invoiced, 20000, "invoiced");
assertEqual(summary.totals.paidIn, 12000, "paid in (partial payment)");
assertEqual(summary.totals.paidOut, 4400, "paid out");
assertEqual(summary.totals.outstandingReceivable, 8000, "outstanding receivable = invoiced - paid in");
assertEqual(summary.grossBeforeTax, 4700, "gross before tax = invoiced - total cost");
assertEqual(summary.taxReservePercent, 12, "tax reserve % is the contract's editable value, not the 15 default");
assertEqual(summary.taxReserve, 2400, "tax reserve = invoiced * 12%");
assertEqual(summary.netAfterTaxReserve, 2300, "net after tax reserve");

const l1Status = lotDeliveryStatus(lots[0], deliveries);
if (l1Status !== "partial") {
  console.error(`FAIL: lot delivery status — expected 'partial', got '${l1Status}'`);
  process.exitCode = 1;
} else {
  console.log(`PASS: lot delivery status derived correctly from partial delivery (${l1Status})`);
}

const l2Status = lotDeliveryStatus(lots[1], deliveries);
if (l2Status !== "pending") {
  console.error(`FAIL: lot l2 delivery status — expected 'pending', got '${l2Status}'`);
  process.exitCode = 1;
} else {
  console.log(`PASS: lot l2 delivery status (no deliveries yet) = ${l2Status}`);
}

const invStatus = invoicePaidStatus(invoices[0], payments);
if (invStatus !== "partially_paid") {
  console.error(`FAIL: invoice paid status — expected 'partially_paid', got '${invStatus}'`);
  process.exitCode = 1;
} else {
  console.log(`PASS: invoice paid status derived correctly from partial inbound payment (${invStatus})`);
}

// Default tax reserve check — a second contract with no override should get 15.
const defaultContract = { id: "c2", tax_reserve_percent: undefined };
const defaultSummary = contractSummary({
  contract: defaultContract,
  quotes: [],
  lots: [],
  expenses: [],
  financingRows: [],
  invoices: [{ id: "inv2", amount: 1000 }],
  payments: [],
  deliveries: [],
});
assertEqual(defaultSummary.taxReservePercent, 15, "default tax reserve percent is 15 when not set on the contract");

if (process.exitCode === 1) {
  console.error("\nONE OR MORE LEDGER LOGIC TESTS FAILED.");
} else {
  console.log("\nAll ledger logic tests passed.");
}
