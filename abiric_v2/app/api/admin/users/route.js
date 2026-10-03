import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!user.is_admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const db = supabaseAdmin();
  // Never select password_hash here — this list is rendered directly in the UI.
  const { data, error } = await db
    .from("users")
    .select("id, email, name, is_admin, role, created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}
