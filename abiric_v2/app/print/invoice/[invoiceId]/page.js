import { supabaseAdmin } from "@/lib/supabase/server";
import { invoicePaidStatus } from "@/lib/ledger";
import { isMissingTableError } from "@/lib/schema-guard";
import InvoicePrintView from "./InvoicePrintView";

export const dynamic = "force-dynamic";

export default async function InvoicePrintPage({ params }) {
  const db = supabaseAdmin();

  const { data: invoice, error } = await db.from("invoices").select("*").eq("id", params.invoiceId).single();
  if (error || !invoice) {
    return <p className="p-10 text-center text-sm text-red-600">Invoice not found.</p>;
  }

  const [{ data: contract }, { data: payments }, companyResult] = await Promise.all([
    db.from("contracts").select("*").eq("id", invoice.contract_id).maybeSingle(),
    db.from("payments").select("*").eq("invoice_id", invoice.id),
    db.from("company_settings").select("*").limit(1).maybeSingle(),
  ]);

  const company = companyResult.error && isMissingTableError(companyResult.error) ? null : companyResult.data;
  const paidStatus = invoicePaidStatus(invoice, payments || []);

  return (
    <InvoicePrintView
      invoice={{ ...invoice, paid_status: paidStatus }}
      contract={contract}
      payments={payments || []}
      company={company}
    />
  );
}
