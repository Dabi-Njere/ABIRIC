import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";
import { isMissingTableError } from "@/lib/schema-guard";

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db.from("company_settings").select("*").limit(1).maybeSingle();

  if (error) {
    // Table doesn't exist yet (migration 003 not applied) — the Admin
    // Company tab can still render an empty editable form instead of a 500.
    if (isMissingTableError(error)) {
      return NextResponse.json({ company: null, migrationPending: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ company: data });
}

const EDITABLE_FIELDS = [
  "legal_name",
  "operating_name",
  "address",
  "phone",
  "email",
  "business_number",
  "gst_hst_number",
  "default_tax_rate",
  "fiscal_year_end",
  "invoice_prefix",
];

export async function PUT(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!user.is_admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const body = await req.json();
  const updates = {};
  for (const key of EDITABLE_FIELDS) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const db = supabaseAdmin();
  const { data: existing } = await db.from("company_settings").select("id").limit(1).maybeSingle();

  const { data, error } = existing
    ? await db
        .from("company_settings")
        .update({ ...updates, updated_by: user.sub, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single()
    : await db
        .from("company_settings")
        .insert({ ...updates, updated_by: user.sub })
        .select()
        .single();

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: "Company settings table doesn't exist yet — run supabase/migrations/003_erp_additions.sql first." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await db.from("audit_log").insert({
    user_id: user.sub,
    action: "update_company_settings",
    details: { changed: Object.keys(updates) },
  });

  return NextResponse.json({ company: data });
}
