import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";
import { invoicePaidStatus } from "@/lib/ledger";
import { isMissingColumnError } from "@/lib/schema-guard";

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const contractId = new URL(req.url).searchParams.get("contract_id");
  if (!contractId) return NextResponse.json({ error: "contract_id is required." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: invoices, error } = await db
    .from("invoices")
    .select("*")
    .eq("contract_id", contractId)
    .order("invoice_date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: payments } = await db.from("payments").select("*").eq("contract_id", contractId);

  const withStatus = invoices.map((inv) => ({
    ...inv,
    paid_status: invoicePaidStatus(inv, payments || []),
  }));

  return NextResponse.json({ invoices: withStatus });
}

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { contract_id, invoice_number, amount, invoice_date, due_date, customer_name, gst_hst_amount } =
    await req.json();
  if (!contract_id || !invoice_number || amount === undefined) {
    return NextResponse.json({ error: "contract_id, invoice_number and amount are required." }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Default the customer name from the contract's client_name if not given
  // explicitly, so Receivables always has something to display.
  let resolvedCustomer = customer_name || null;
  if (!resolvedCustomer) {
    const { data: contract } = await db.from("contracts").select("client_name").eq("id", contract_id).maybeSingle();
    resolvedCustomer = contract?.client_name || null;
  }

  const baseInsert = {
    contract_id,
    invoice_number,
    amount,
    invoice_date: invoice_date || new Date().toISOString().slice(0, 10),
    due_date: due_date || null,
    created_by: user.sub,
  };
  const extendedInsert = { ...baseInsert, customer_name: resolvedCustomer, gst_hst_amount: gst_hst_amount ?? 0 };

  let { data, error } = await db.from("invoices").insert(extendedInsert).select().single();

  if (error && isMissingColumnError(error)) {
    ({ data, error } = await db.from("invoices").insert(baseInsert).select().single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("audit_log").insert({
    user_id: user.sub,
    action: "create_invoice",
    details: { contract_id, invoice_number, amount },
  });

  return NextResponse.json({ invoice: data });
}
