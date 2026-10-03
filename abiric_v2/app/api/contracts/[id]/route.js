import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";
import { isMissingColumnError } from "@/lib/schema-guard";

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

      // Backfill the link/value on contracts created before these columns
      // existed, so older awards resolve a "View Contract" link too.
      // Tolerates migration 003 not being applied yet — falls back to
      // skipping the backfill rather than failing the stage change.
      if (existing.tracked_contract_id === undefined || !existing.tracked_contract_id) {
        const { data: backfilled, error: backfillError } = await db
          .from("contracts")
          .update({
            tracked_contract_id: tracked.id,
            awarded_value: existing.awarded_value ?? tracked.estimated_value ?? null,
          })
          .eq("id", existing.id)
          .select()
          .single();
        if (backfilled) operationalContract = backfilled;
        else if (backfillError && !isMissingColumnError(backfillError)) {
          // Non-schema error — surface it rather than silently continuing.
          console.error("Contract backfill failed:", backfillError.message);
        }
      }
    } else {
      const raw = tracked.raw_data || {};

      const clientName =
        tracked.organization ||
        raw["Organization name"] ||
        raw["Organization Name"] ||
        raw["Organization"] ||
        raw["Department"] ||
        null;

      const baseInsert = {
        contract_number: contractNumber,
        title: tracked.title,
        line: "procurement",
        client_name: clientName,
        tax_reserve_percent: 15,
        notes: tracked.notes || null,
        created_by: user.sub,
      };

      let { data: created, error: createError } = await db
        .from("contracts")
        .insert({
          ...baseInsert,
          tracked_contract_id: tracked.id,
          awarded_value: tracked.estimated_value ?? null,
        })
        .select()
        .single();

      // If migration 003_erp_additions.sql hasn't been applied yet, these
      // two columns won't exist — retry without them so the core
      // Opportunity → Won → Contract handoff still succeeds. The link/value
      // then gets backfilled automatically once the migration runs (see
      // the `existing` branch above, which runs on the next Won/duplicate
      // check against this same contract_number).
      if (createError && isMissingColumnError(createError)) {
        ({ data: created, error: createError } = await db
          .from("contracts")
          .insert(baseInsert)
          .select()
          .single());
      }

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