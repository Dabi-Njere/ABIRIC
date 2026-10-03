import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";
import { invoicePaidStatus } from "@/lib/ledger";
import { isMissingTableError } from "@/lib/schema-guard";

export async function GET(req, { params }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const db = supabaseAdmin();

  const { data: invoice, error } = await db.from("invoices").select("*").eq("id", params.id).single();
  if (error) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const [{ data: contract }, { data: payments }, companyResult] = await Promise.all([
    db.from("contracts").select("*").eq("id", invoice.contract_id).maybeSingle(),
    db.from("payments").select("*").eq("invoice_id", invoice.id),
    db.from("company_settings").select("*").limit(1).maybeSingle(),
  ]);

  // company_settings may not exist yet if migration 003 hasn't run — the
  // letterhead falls back to defaults rather than failing the whole route.
  const company = companyResult.error && isMissingTableError(companyResult.error) ? null : companyResult.data;

  return NextResponse.json({
    invoice: { ...invoice, paid_status: invoicePaidStatus(invoice, payments || []) },
    contract,
    payments: payments || [],
    company: company || null,
  });
}
