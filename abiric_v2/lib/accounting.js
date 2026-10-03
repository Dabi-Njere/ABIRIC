import { sum, invoicePaidStatus } from "@/lib/ledger";

function groupBy(rows, key) {
  const map = new Map();
  for (const r of rows) {
    const k = r[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return map;
}

export async function getAccountingData(db) {
  const [
    { data: contracts },
    { data: purchaseLots },
    { data: directExpenses },
    { data: financingRows },
    { data: invoices },
    { data: payments },
  ] = await Promise.all([
    db.from("contracts").select("*"),
    db.from("purchase_lots").select("*"),
    db.from("direct_expenses").select("*"),
    db.from("financing").select("*"),
    db.from("invoices").select("*"),
    db.from("payments").select("*"),
  ]);

  const contractsList = contracts || [];
  const lotsByContract = groupBy(purchaseLots || [], "contract_id");
  const expensesByContract = groupBy(directExpenses || [], "contract_id");
  const financingByContract = groupBy(financingRows || [], "contract_id");
  const invoicesByContract = groupBy(invoices || [], "contract_id");
  const paymentsByContract = groupBy(payments || [], "contract_id");

  // ---- Contract Profitability ----
  const contractProfitability = contractsList.map((c) => {
    const lots = lotsByContract.get(c.id) || [];
    const expenses = expensesByContract.get(c.id) || [];
    const financing = financingByContract.get(c.id) || [];
    const contractInvoices = invoicesByContract.get(c.id) || [];

    const purchaseCost = sum(lots, "actual_total_cost");
    const directExpenseTotal = sum(expenses, "amount");
    const financingTotal = sum(financing, "amount");
    const revenue = sum(contractInvoices, "amount");
    const grossProfit = revenue - (purchaseCost + directExpenseTotal);
    const marginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : null;

    const contractPayments = paymentsByContract.get(c.id) || [];
    const collected = sum(
      contractPayments.filter((p) => p.direction === "inbound"),
      "amount"
    );
    const outstanding = revenue - collected;

    // Delivery status aggregated from each lot's own stored status (kept
    // current by the deliveries route) — no re-derivation here.
    let deliveryStatus = "No purchases";
    if (lots.length > 0) {
      if (lots.every((l) => l.delivery_status === "received")) deliveryStatus = "Received";
      else if (lots.some((l) => l.delivery_status !== "pending")) deliveryStatus = "Partial";
      else deliveryStatus = "Pending";
    }

    return {
      contractId: c.id,
      contractNumber: c.contract_number,
      title: c.title,
      client: c.client_name || "—",
      status: c.status,
      awardedValue: c.awarded_value ?? null,
      revenue,
      purchaseCost,
      directExpenses: directExpenseTotal,
      financing: financingTotal,
      grossProfit,
      marginPercent,
      collected,
      outstanding,
      deliveryStatus,
    };
  });

  // ---- Receivables (all invoices, with derived paid status) ----
  const receivables = (invoices || []).map((inv) => {
    const contractPayments = paymentsByContract.get(inv.contract_id) || [];
    const paid = sum(
      contractPayments.filter((p) => p.invoice_id === inv.id && p.direction === "inbound"),
      "amount"
    );
    const contract = contractsList.find((c) => c.id === inv.contract_id);
    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      contractNumber: contract?.contract_number || "",
      customer: inv.customer_name || contract?.client_name || "—",
      invoiceDate: inv.invoice_date,
      dueDate: inv.due_date,
      total: Number(inv.amount),
      paid,
      outstanding: Number(inv.amount) - paid,
      status: invoicePaidStatus(inv, contractPayments),
      gstHst: Number(inv.gst_hst_amount || 0),
    };
  });

  // ---- Expense Register (all direct expenses, across all contracts) ----
  const expenseRegister = (directExpenses || []).map((e) => {
    const contract = contractsList.find((c) => c.id === e.contract_id);
    return {
      id: e.id,
      contractNumber: contract?.contract_number || "",
      date: e.expense_date,
      category: e.category,
      payee: e.payee || "",
      description: e.description || "",
      amount: Number(e.amount),
      gstHst: Number(e.gst_hst_amount || 0),
      total: Number(e.amount) + Number(e.gst_hst_amount || 0),
      receiptReference: e.receipt_reference || "",
      paymentStatus: e.payment_status || "unpaid",
      paymentMethod: e.payment_method || "",
    };
  });

  // ---- Financial Summary (portfolio-wide) ----
  const revenueTotal = sum(invoices || [], "amount");
  const paidInTotal = sum((payments || []).filter((p) => p.direction === "inbound"), "amount");
  const accountsReceivable = revenueTotal - paidInTotal;
  const purchaseCostTotal = sum(purchaseLots || [], "actual_total_cost");
  const directExpenseTotal = sum(directExpenses || [], "amount");
  const financingTotal = sum(financingRows || [], "amount");
  const grossProfitTotal = revenueTotal - (purchaseCostTotal + directExpenseTotal);
  const netContractContribution = revenueTotal - (purchaseCostTotal + directExpenseTotal + financingTotal);

  // ---- GST/HST Summary ----
  // Explicit capture only — never derived/guessed from totals. Historical
  // rows recorded before gst_hst_amount existed will show $0 here until
  // re-entered with the breakout.
  const gstCollected = sum(invoices || [], "gst_hst_amount");
  const gstPaid = sum(directExpenses || [], "gst_hst_amount");
  const gstNetPosition = gstCollected - gstPaid;
  const hasAnyGstData = gstCollected > 0 || gstPaid > 0;

  return {
    financialSummary: {
      revenueTotal,
      paidInTotal,
      accountsReceivable,
      purchaseCostTotal,
      directExpenseTotal,
      financingTotal,
      grossProfitTotal,
      netContractContribution,
    },
    gstSummary: { gstCollected, gstPaid, gstNetPosition, hasAnyGstData },
    contractProfitability,
    receivables,
    expenseRegister,
  };
}
