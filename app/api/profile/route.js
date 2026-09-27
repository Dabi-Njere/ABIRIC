import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db.from("company_profile").select("*").limit(1).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function PUT(req) {
  const user = getUserFromRequest(req);
  if (!user?.is_admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const updates = await req.json();
  const db = supabaseAdmin();

  const { data: existing } = await db.from("company_profile").select("id").limit(1).maybeSingle();

  const { data, error } = existing
    ? await db.from("company_profile").update(updates).eq("id", existing.id).select().single()
    : await db.from("company_profile").insert(updates).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("audit_log").insert({ user_id: user.sub, action: "update_company_profile" });

  return NextResponse.json({ profile: data });
}
