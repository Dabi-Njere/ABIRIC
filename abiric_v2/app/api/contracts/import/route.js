import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";

function generateBidId() {
  return `BID-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// Expects { rows: [{ title, reference_number, organization, category, region,
// closing_date, estimated_value, tender_url, notes, _raw }] } — already
// mapped and selected client-side by the import wizard. Each row is
// validated and checked for a duplicate reference_number before insert;
// nothing is silently skipped — every row gets a per-row result.
export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { rows } = await req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to import." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: existing } = await db.from("tracked_contracts").select("reference_number");
  const existingRefs = new Set((existing || []).map((r) => r.reference_number).filter(Boolean));

  const results = [];
  for (const row of rows) {
    const title = (row.title || "").trim();
    if (!title) {
      results.push({ row, status: "error", message: "Missing required title." });
      continue;
    }

    const reference_number = (row.reference_number || "").trim() || null;
    if (reference_number && existingRefs.has(reference_number)) {
      results.push({ row, status: "duplicate", message: `Reference ${reference_number} already tracked.` });
      continue;
    }

    const estimated_value =
      row.estimated_value !== undefined && row.estimated_value !== "" && !isNaN(Number(row.estimated_value))
        ? Number(row.estimated_value)
        : null;

    const { data, error } = await db
      .from("tracked_contracts")
      .insert({
        user_id: user.sub,
        bid_id: generateBidId(),
        title,
        reference_number,
        organization: row.organization || null,
        category: row.category || null,
        region: row.region || null,
        closing_date: row.closing_date || null,
        estimated_value,
        tender_url: row.tender_url || null,
        notes: row.notes || "",
        raw_data: row._raw || row,
        stage: "New",
      })
      .select()
      .single();

    if (error) {
      results.push({ row, status: "error", message: error.message });
      continue;
    }

    if (reference_number) existingRefs.add(reference_number);
    results.push({ row, status: "imported", id: data.id });
  }

  const imported = results.filter((r) => r.status === "imported").length;

  await db.from("audit_log").insert({
    user_id: user.sub,
    action: "import_opportunities_csv",
    details: { attempted: rows.length, imported, duplicates: results.filter((r) => r.status === "duplicate").length, errors: results.filter((r) => r.status === "error").length },
  });

  return NextResponse.json({ results, imported });
}
