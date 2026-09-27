import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const contractId = new URL(req.url).searchParams.get("contract_id");
  if (!contractId) return NextResponse.json({ error: "contract_id is required." }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("payments")
    .select("*")
    .eq("contract_id", contractId)
    .order("payment_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payments: data });
}

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { contract_id, invoice_id, direction, amount, payment_date, method, notes } = await req.json();

  if (!contract_id || !direction || amount === undefined) {
    return NextResponse.json({ error: "contract_id, direction and amount are required." }, { status: 400 });
  }
  if (!["inbound", "outbound"].includes(direction)) {
    return NextResponse.json({ error: "direction must be 'inbound' or 'outbound'." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("payments")
    .insert({
      contract_id,
      invoice_id: invoice_id || null,
      direction,
      amount,
      payment_date: payment_date || new Date().toISOString().slice(0, 10),
      method: method || null,
      notes: notes || null,
      created_by: user.sub,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("audit_log").insert({
    user_id: user.sub,
    action: "record_payment",
    details: { contract_id, direction, amount },
  });

  return NextResponse.json({ payment: data });
}
