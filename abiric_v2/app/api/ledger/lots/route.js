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
    .from("purchase_lots")
    .select("*")
    .eq("contract_id", contractId)
    .order("purchase_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lots: data });
}

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const {
    contract_id,
    quote_id,
    supplier_name,
    description,
    quantity,
    unit,
    actual_unit_cost,
    actual_total_cost,
    purchase_date,
  } = await req.json();

  if (!contract_id || !supplier_name || quantity === undefined || actual_total_cost === undefined) {
    return NextResponse.json(
      { error: "contract_id, supplier_name, quantity and actual_total_cost are required." },
      { status: 400 }
    );
  }

  // actual_total_cost is stored exactly as entered — it is the recorded
  // cost fact, not recomputed from quantity * unit cost (freight, duties,
  // and rounding at time of purchase may make the two diverge on purpose).
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("purchase_lots")
    .insert({
      contract_id,
      quote_id: quote_id || null,
      supplier_name,
      description: description || null,
      quantity,
      unit: unit || null,
      actual_unit_cost: actual_unit_cost ?? actual_total_cost / quantity,
      actual_total_cost,
      purchase_date: purchase_date || new Date().toISOString().slice(0, 10),
      delivery_status: "pending",
      created_by: user.sub,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("audit_log").insert({
    user_id: user.sub,
    action: "create_purchase_lot",
    details: { contract_id, supplier_name, actual_total_cost },
  });

  return NextResponse.json({ lot: data });
}
