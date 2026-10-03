import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyPassword, signToken } from "@/lib/auth";

export async function POST(req) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: user, error } = await db
    .from("users")
    .select("id, email, password_hash, name, is_admin, role, permissions")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    is_admin: user.is_admin,
    role: user.role,
  });

  await db.from("audit_log").insert({
    user_id: user.id,
    action: "login",
    details: { email: user.email },
  });

  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin, role: user.role },
  });

  res.cookies.set("abiric_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return res;
}
