import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";
import { lotDeliveryStatus } from "@/lib/ledger";

export async function GET(req, { params }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("lot_deliveries")
    .select("*")
    .eq("lot_id", params.id)
    .order("delivery_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deliveries: data });
}

export async function POST(req, { params }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { delivered_quantity, delivery_date, notes } = await req.json();
  if (delivered_quantity === undefined) {
    return NextResponse.json({ error: "delivered_quantity is required." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: lot, error: lotErr } = await db
    .from("purchase_lots")
    .select("*")
    .eq("id", params.id)
    .single();
  if (lotErr) return NextResponse.json({ error: "Lot not found." }, { status: 404 });

  const { data: delivery, error } = await db
    .from("lot_deliveries")
    .insert({
      lot_id: params.id,
      contract_id: lot.contract_id,
      delivered_quantity,
      delivery_date: delivery_date || new Date().toISOString().slice(0, 10),
      notes: notes || null,
      created_by: user.sub,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recompute and persist the derived status onto the lot for cheap reads
  // elsewhere — the source of truth remains the delivery events themselves.
  const { data: allDeliveries } = await db.from("lot_deliveries").select("*").eq("lot_id", params.id);
  const newStatus = lotDeliveryStatus(lot, allDeliveries || []);

  await db.from("purchase_lots").update({ delivery_status: newStatus }).eq("id", params.id);

  await db.from("audit_log").insert({
    user_id: user.sub,
    action: "record_delivery",
    details: { lot_id: params.id, delivered_quantity, new_status: newStatus },
  });

  return NextResponse.json({ delivery, delivery_status: newStatus });
}
