import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";

function generateBidId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BID-${rand}`;
}

export async function GET(req) {
  const user = getUserFromRequest(req);

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const db = supabaseAdmin();

  const { data, error } = await db
    .from("tracked_contracts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    contracts: data || [],
  });
}

export async function POST(req) {
  const user = getUserFromRequest(req);

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const contract = body.contract || body;

  if (!contract?.title && !contract?.["Title"]) {
    return NextResponse.json(
      { error: "Opportunity title is required." },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();
  const bid_id = generateBidId();

  const title =
    contract.title ||
    contract["Title"];

  const reference_number =
    contract.reference_number ||
    contract["Reference number"] ||
    contract.referenceNumber ||
    null;

  const organization =
    contract.organization ||
    contract["Organization name"] ||
    contract["Organization Name"] ||
    contract["Organization"] ||
    contract["Department"] ||
    null;

  const category =
    contract.category ||
    contract["Category"] ||
    null;

  const region =
    contract.region ||
    contract["Region"] ||
    null;

  const closing_date =
    contract.closing_date ||
    contract["Closing date"] ||
    contract["Closing Date"] ||
    contract.closingDate ||
    null;

  const estimated_value =
    contract.estimated_value !== undefined &&
    contract.estimated_value !== ""
      ? Number(contract.estimated_value)
      : null;

  const tender_url =
    contract.tender_url ||
    contract.url ||
    contract["Tender URL"] ||
    null;

  const notes =
    contract.notes || "";

  const { data, error } = await db
    .from("tracked_contracts")
    .insert({
      user_id: user.sub,
      bid_id,
      title,
      reference_number,
      organization,
      category,
      region,
      closing_date,
      estimated_value,
      tender_url,
      raw_data: contract,
      stage: "New",
      notes,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  await db.from("audit_log").insert({
    user_id: user.sub,
    action: "track_contract",
    details: {
      bid_id,
      title: data.title,
      source: body.contract ? "import" : "manual",
    },
  });

  return NextResponse.json({
    tracked: data,
  });
}