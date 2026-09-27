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
    .from("supplier_quotes")
    .select("*")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quotes: data });
}

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { contract_id, supplier_name, description, quoted_amount, currency, quote_date, status, notes } =
    await req.json();

  if (!contract_id || !supplier_name || quoted_amount === undefined) {
    return NextResponse.json(
      { error: "contract_id, supplier_name and quoted_amount are required." },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("supplier_quotes")
    .insert({
      contract_id,
      supplier_name,
      description: description || null,
      quoted_amount,
      currency: currency || "CAD",
      quote_date: quote_date || new Date().toISOString().slice(0, 10),
      status: status || "received",
      notes: notes || null,
      created_by: user.sub,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("audit_log").insert({
    user_id: user.sub,
    action: "create_quote",
    details: { contract_id, supplier_name, quoted_amount },
  });

  return NextResponse.json({ quote: data });
}
