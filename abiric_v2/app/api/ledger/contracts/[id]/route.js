import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";

// Fields it's legitimate to edit after creation. Financial *facts*
// (quotes, lots, expenses, financing, invoices, payments) are never
// edited in place elsewhere in this API — only appended to. This is
// intentionally the one place a value can change, and every change
// is written to audit_log with old/new values so history isn't lost.
const MUTABLE_FIELDS = ["title", "status", "tax_reserve_percent", "notes", "client_name"];

export async function GET(req, { params }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db.from("contracts").select("*").eq("id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({ contract: data });
}

export async function PATCH(req, { params }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json();
  const updates = {};
  for (const key of MUTABLE_FIELDS) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No editable fields provided." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: before, error: beforeErr } = await db
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .single();
  if (beforeErr) return NextResponse.json({ error: beforeErr.message }, { status: 404 });

  const { data: after, error } = await db
    .from("contracts")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const changed = {};
  for (const key of Object.keys(updates)) {
    changed[key] = { from: before[key], to: after[key] };
  }

  await db.from("audit_log").insert({
    user_id: user.sub,
    action: "update_contract",
    details: { contract_id: params.id, changed },
  });

  return NextResponse.json({ contract: after });
}
