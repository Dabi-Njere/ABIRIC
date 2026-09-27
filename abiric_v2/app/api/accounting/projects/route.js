import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db.from("projects").select("*").order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { name, contract_id, revenue } = await req.json();
  if (!name) return NextResponse.json({ error: "Project name is required." }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("projects")
    .insert({ name, contract_id: contract_id || null, revenue: revenue || 0, created_by: user.sub })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("audit_log").insert({ user_id: user.sub, action: "create_project", details: { name } });

  return NextResponse.json({ project: data });
}
