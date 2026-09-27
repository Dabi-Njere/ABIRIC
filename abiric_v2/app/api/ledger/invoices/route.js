import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";
import { invoicePaidStatus } from "@/lib/ledger";

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

  const { contract_id, invoice_number, amount, invoice_date, due_date } = await req.json();
  if (!contract_id || !invoice_number || amount === undefined) {
    return NextResponse.json({ error: "contract_id, invoice_number and amount are required." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("invoices")
    .insert({
      contract_id,
      invoice_number,
      amount,
      invoice_date: invoice_date || new Date().toISOString().slice(0, 10),
      due_date: due_date || null,
      created_by: user.sub,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("audit_log").insert({
    user_id: user.sub,
    action: "create_invoice",
    details: { contract_id, invoice_number, amount },
  });

  return NextResponse.json({ invoice: data });
}
