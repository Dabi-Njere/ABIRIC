import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db.from("contracts").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ contracts: data });
}

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { contract_number, title, line, client_name, tax_reserve_percent, notes } = await req.json();

  if (!contract_number || !title || !line) {
    return NextResponse.json({ error: "contract_number, title and line are required." }, { status: 400 });
  }
  if (!["procurement", "consulting"].includes(line)) {
    return NextResponse.json({ error: "line must be 'procurement' or 'consulting'." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("contracts")
    .insert({
      contract_number,
      title,
      line,
      client_name: client_name || null,
      tax_reserve_percent: tax_reserve_percent ?? 15.0,
      notes: notes || null,
      created_by: user.sub,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("audit_log").insert({
    user_id: user.sub,
    action: "create_contract",
    details: { contract_number, line },
  });

  return NextResponse.json({ contract: data });
}
