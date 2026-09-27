import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";

const VALID_STAGES = ["New", "Reviewing", "Bidding", "Submitted", "Won", "Passed"];

export async function PATCH(req, { params }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = params;
  const { stage, notes } = await req.json();

  if (stage && !VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: `Stage must be one of: ${VALID_STAGES.join(", ")}` }, { status: 400 });
  }

  const db = supabaseAdmin();
  const updates = {};
  if (stage) updates.stage = stage;
  if (notes !== undefined) updates.notes = notes;

  const { data, error } = await db
    .from("tracked_contracts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("audit_log").insert({
    user_id: user.sub,
    action: "update_pipeline_stage",
    details: { id, ...updates },
  });

  return NextResponse.json({ contract: data });
}
