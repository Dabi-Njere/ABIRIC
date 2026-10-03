import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";
import { getMonthlyStatement } from "@/lib/monthly-statement";

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const month = new URL(req.url).searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month query param required, format YYYY-MM." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const statement = await getMonthlyStatement(db, month);
  return NextResponse.json({ statement });
}
