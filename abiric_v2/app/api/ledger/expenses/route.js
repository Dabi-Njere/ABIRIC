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
    .from("direct_expenses")
    .select("*")
    .eq("contract_id", contractId)
    .order("expense_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expenses: data });
}

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { contract_id, category, description, amount, expense_date } = await req.json();
  if (!contract_id || !category || amount === undefined) {
    return NextResponse.json({ error: "contract_id, category and amount are required." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("direct_expenses")
    .insert({
      contract_id,
      category,
      description: description || null,
      amount,
      expense_date: expense_date || new Date().toISOString().slice(0, 10),
      created_by: user.sub,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("audit_log").insert({
    user_id: user.sub,
    action: "create_direct_expense",
    details: { contract_id, category, amount },
  });

  return NextResponse.json({ expense: data });
}
