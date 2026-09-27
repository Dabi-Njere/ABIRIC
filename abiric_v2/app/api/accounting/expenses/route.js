import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";

export const EXPENSE_CATEGORIES = [
  "Labour",
  "Materials",
  "Software",
  "Travel",
  "Subcontractors",
  "Marketing",
  "Office",
  "Insurance",
  "Other",
];

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const project_id = searchParams.get("project_id");

  const db = supabaseAdmin();
  let query = db.from("expenses").select("*").order("date", { ascending: false });
  if (project_id) query = query.eq("project_id", project_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ expenses: data });
}

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { project_id, category, amount, description, date } = await req.json();

  if (!project_id || !category || !amount) {
    return NextResponse.json({ error: "project_id, category and amount are required." }, { status: 400 });
  }
  if (!EXPENSE_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: `category must be one of: ${EXPENSE_CATEGORIES.join(", ")}` }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("expenses")
    .insert({
      project_id,
      category,
      amount,
      description: description || "",
      date: date || new Date().toISOString().slice(0, 10),
      created_by: user.sub,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ expense: data });
}
