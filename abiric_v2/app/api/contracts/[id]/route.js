import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";

const VALID_STAGES = [
  "New",
  "Reviewing",
  "Bidding",
  "Submitted",
  "Won",
  "Passed",
];

export async function PATCH(req, { params }) {
  const user = getUserFromRequest(req);

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const { id } = params;
  const { stage, notes } = await req.json();

  if (stage && !VALID_STAGES.includes(stage)) {
    return NextResponse.json(
      {
        error: `Stage must be one of: ${VALID_STAGES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  const updates = {};

  if (stage) updates.stage = stage;
  if (notes !== undefined) updates.notes = notes;

  const { data: tracked, error } = await db
    .from("tracked_contracts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  let operationalContract = null;

  /*
   * AWARD HANDOFF
   * When an opportunity becomes Won, create its operational
   * contract automatically.
   */
  if (stage === "Won") {
    const contractNumber =
      tracked.reference_number ||
      tracked.bid_id;

    const { data: existing, error: existingError } = await db
      .from("contracts")
      .select("*")
      .eq("contract_number", contractNumber)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          error: `Opportunity was marked Won, but contract lookup failed: ${existingError.message}`,
        },
        { status: 500 }
      );
    }

    if (existing) {
      operationalContract = existing;
    } else {
      const raw = tracked.raw_data || {};

      const clientName =
        tracked.organization ||
        raw["Organization name"] ||
        raw["Organization Name"] ||
        raw["Organization"] ||
        raw["Department"] ||
        null;

      const { data: created, error: createError } = await db
        .from("contracts")
        .insert({
          contract_number: contractNumber,
          title: tracked.title,
          line: "procurement",
          client_name: clientName,
          tax_reserve_percent: 15,
          notes: tracked.notes || null,
          created_by: user.sub,
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          {
            error: `Opportunity was marked Won, but contract creation failed: ${createError.message}`,
          },
          { status: 500 }
        );
      }

      operationalContract = created;

      await db.from("audit_log").insert({
        user_id: user.sub,
        action: "convert_opportunity_to_contract",
        details: {
          tracked_contract_id: tracked.id,
          contract_id: created.id,
          contract_number: created.contract_number,
        },
      });
    }
  }

  await db.from("audit_log").insert({
    user_id: user.sub,
    action: "update_pipeline_stage",
    details: {
      id,
      ...updates,
    },
  });

  return NextResponse.json({
    contract: tracked,
    operational_contract: operationalContract,
  });
}