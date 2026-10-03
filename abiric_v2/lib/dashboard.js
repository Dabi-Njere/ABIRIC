import { sum } from "@/lib/ledger";

const ACTIVE_STAGES = ["New", "Reviewing", "Bidding", "Submitted"];
const BIDDING_STAGES = ["Bidding", "Submitted"];

// Same dedicated-column-first logic as the Pipeline page's getTenderMeta,
// kept here as a small server-side copy since this runs outside the client
// component tree. If this drifts again, that's the bug from section 15
// repeating — keep both in sync.
function opportunityClient(o) {
  const raw = o.raw_data || {};
  return (
    o.organization ||
    raw["Organization name"] ||
    raw["Organization Name"] ||
    raw["Organization"] ||
    raw["Department"] ||
    null
  );
}

export async function getOverviewData(db) {
  const [
    { data: opportunities },
    { data: contracts },
    { data: purchaseLots },
    { data: directExpenses },
    { data: financingRows },
    { data: invoices },
    { data: payments },
  ] = await Promise.all([
    db.from("tracked_contracts").select("*"),
    db.from("contracts").select("*"),
    db.from("purchase_lots").select("contract_id, actual_total_cost"),
    db.from("direct_expenses").select("contract_id, amount"),
    db.from("financing").select("contract_id, amount"),
    db.from("invoices").select("id, contract_id, amount, invoice_number, due_date"),
    db.from("payments").select("invoice_id, direction, amount"),
  ]);

  const opp = opportunities || [];
  const activeOpportunities = opp.filter((o) => ACTIVE_STAGES.includes(o.stage));

  // KPI 1 — Pipeline Value: estimated value of everything not yet decided
  // (New/Reviewing/Bidding/Submitted). Estimate-based, not a cash figure.
  const pipelineValue = sum(activeOpportunities, "estimated_value");

  // KPI 2 — Active Bids: opportunities actually in a bidding/submitted
  // state (narrower than "active" above — New/Reviewing are pre-bid).
  const activeBids = opp.filter((o) => BIDDING_STAGES.includes(o.stage)).length;

  // KPI 3 — Contracts Won: rows in `contracts`, i.e. actually awarded and
  // converted to an operational contract (not merely a Won pipeline stage —
  // those are the same event via the award handoff, but this counts the
  // authoritative record).
  const contractsList = (contracts || []).filter((c) => c.status !== "cancelled");
  const contractsWon = contractsList.length;
  const totalAwardedValue = sum(contractsList, "awarded_value");

  // KPI 4 — Outstanding Receivables: invoiced total minus inbound payments,
  // across all contracts. This is a cash-basis figure (what's actually
  // still owed), not the accrual "revenue" figure used below.
  const invoicedTotal = sum(invoices || [], "amount");
  const paidInTotal = sum((payments || []).filter((p) => p.direction === "inbound"), "amount");
  const outstandingReceivables = invoicedTotal - paidInTotal;

  // Contract Performance — accrual revenue (invoiced, not cash collected —
  // labeled explicitly in the UI) vs. direct costs, no overhead allocation:
  // straight sum of purchase lot actual costs + direct expenses + financing.
  const directCosts =
    sum(purchaseLots || [], "actual_total_cost") +
    sum(directExpenses || [], "amount") +
    sum(financingRows || [], "amount");
  const grossMargin = invoicedTotal - directCosts;
  const grossMarginPercent = invoicedTotal > 0 ? (grossMargin / invoicedTotal) * 100 : null;

  // Active Pipeline list — soonest closing date first.
  const activePipeline = [...activeOpportunities]
    .sort((a, b) => {
      const da = a.closing_date ? new Date(a.closing_date).getTime() : Infinity;
      const db_ = b.closing_date ? new Date(b.closing_date).getTime() : Infinity;
      return da - db_;
    })
    .slice(0, 6)
    .map((o) => ({
      id: o.id,
      title: o.title,
      client: opportunityClient(o),
      stage: o.stage,
      closingDate: o.closing_date || null,
      estimatedValue: o.estimated_value ?? null,
    }));

  // Upcoming Deadlines — opportunity closing dates within 30 days, plus
  // unpaid invoice due dates within 30 days. No delivery-milestone dates
  // yet: purchase_lots has no expected-delivery-date field to draw from.
  const now = Date.now();
  const horizon = now + 30 * 24 * 60 * 60 * 1000;

  const paidByInvoice = new Map();
  for (const p of payments || []) {
    if (p.direction !== "inbound" || !p.invoice_id) continue;
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) || 0) + Number(p.amount || 0));
  }

  const deadlineOpps = opp
    .filter((o) => o.closing_date && ACTIVE_STAGES.includes(o.stage))
    .map((o) => ({ type: "opportunity", label: o.title, date: o.closing_date }))
    .filter((d) => {
      const t = new Date(d.date).getTime();
      return t >= now - 24 * 60 * 60 * 1000 && t <= horizon;
    });

  const deadlineInvoices = (invoices || [])
    .filter((inv) => inv.due_date)
    .filter((inv) => (paidByInvoice.get(inv.id) || 0) < Number(inv.amount))
    .map((inv) => ({ type: "invoice", label: `Invoice ${inv.invoice_number || inv.id.slice(0, 8)}`, date: inv.due_date }))
    .filter((d) => {
      const t = new Date(d.date).getTime();
      return t >= now - 24 * 60 * 60 * 1000 && t <= horizon;
    });

  const upcomingDeadlines = [...deadlineOpps, ...deadlineInvoices]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 6);

  return {
    kpis: { pipelineValue, activeBids, contractsWon, totalAwardedValue, outstandingReceivables },
    performance: { invoicedTotal, directCosts, grossMargin, grossMarginPercent },
    activePipeline,
    upcomingDeadlines,
  };
}
