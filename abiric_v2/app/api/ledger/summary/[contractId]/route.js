import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";
import { contractSummary } from "@/lib/ledger";

export async function GET(req, { params }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const db = supabaseAdmin();
  const contractId = params.contractId;

  const { data: contract, error: contractErr } = await db
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .single();
  if (contractErr) return NextResponse.json({ error: "Contract not found." }, { status: 404 });

  const [{ data: quotes }, { data: lots }, { data: expenses }, { data: financingRows }, { data: invoices }, { data: payments }, { data: deliveries }] =
    await Promise.all([
      db.from("supplier_quotes").select("*").eq("contract_id", contractId),
      db.from("purchase_lots").select("*").eq("contract_id", contractId),
      db.from("direct_expenses").select("*").eq("contract_id", contractId),
      db.from("financing").select("*").eq("contract_id", contractId),
      db.from("invoices").select("*").eq("contract_id", contractId),
      db.from("payments").select("*").eq("contract_id", contractId),
      db.from("lot_deliveries").select("*").eq("contract_id", contractId),
    ]);

  const summary = contractSummary({
    contract,
    quotes: quotes || [],
    lots: lots || [],
    expenses: expenses || [],
    financingRows: financingRows || [],
    invoices: invoices || [],
    payments: payments || [],
    deliveries: deliveries || [],
  });

  return NextResponse.json({ summary });
}
