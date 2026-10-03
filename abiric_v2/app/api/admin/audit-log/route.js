import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!user.is_admin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const db = supabaseAdmin();

  const { data: entries, error } = await db
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((entries || []).map((e) => e.user_id).filter(Boolean))];
  const { data: users } = userIds.length
    ? await db.from("users").select("id, email, name").in("id", userIds)
    : { data: [] };

  const userMap = new Map((users || []).map((u) => [u.id, u.name || u.email]));

  const enriched = (entries || []).map((e) => ({
    id: e.id,
    timestamp: e.created_at,
    user: userMap.get(e.user_id) || "System",
    action: e.action,
    details: e.details,
  }));

  return NextResponse.json({ entries: enriched });
}
