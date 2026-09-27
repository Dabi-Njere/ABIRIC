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
    .from("financing")
    .select("*")
    .eq("contract_id", contractId)
    .order("start_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ financing: data });
}

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { contract_id, provider, financing_type, amount, interest_rate, start_date, terms } = await req.json();
  if (!contract_id || !provider || !financing_type || amount === undefined) {
    return NextResponse.json(
      { error: "contract_id, provider, financing_type and amount are required." },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("financing")
    .insert({
      contract_id,
      provider,
      financing_type,
      amount,
      interest_rate: interest_rate ?? null,
      start_date: start_date || new Date().toISOString().slice(0, 10),
      terms: terms || null,
      created_by: user.sub,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("audit_log").insert({
    user_id: user.sub,
    action: "create_financing",
    details: { contract_id, provider, amount },
  });

  return NextResponse.json({ financing: data });
}
