import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";

function generateBidId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BID-${rand}`;
}

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { contract } = await req.json();
  if (!contract) {
    return NextResponse.json({ error: "Contract payload is required." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const bid_id = generateBidId();

  const { data, error } = await db
    .from("tracked_contracts")
    .insert({
      user_id: user.sub,
      bid_id,
      title: contract.title || contract["Title"] || "Untitled tender",
      reference_number: contract["Reference number"] || contract["referenceNumber"] || null,
      raw_data: contract,
      stage: "New",
      notes: "",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await db.from("audit_log").insert({
    user_id: user.sub,
    action: "track_contract",
    details: { bid_id, title: data.title },
  });

  return NextResponse.json({ tracked: data });
}
