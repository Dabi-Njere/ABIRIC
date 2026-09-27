import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/auth";

export async function POST(req) {
  const { email, password, name } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const password_hash = await hashPassword(password);

  const { data: user, error } = await db
    .from("users")
    .insert({
      email: email.toLowerCase().trim(),
      password_hash,
      name,
      is_admin: false,
      role: "Analyst",
      permissions: { contracts: true, rfp: false, pipeline: false, accounting: false, admin: false },
    })
    .select("id, email, name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await db.from("audit_log").insert({
    user_id: user.id,
    action: "register",
    details: { email: user.email },
  });

  return NextResponse.json({ user });
}
