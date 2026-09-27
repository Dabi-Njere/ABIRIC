import { NextResponse } from "next/server";
import Papa from "papaparse";
import { getUserFromRequest } from "@/lib/auth";

// CanadaBuys publishes an open, free CSV of tender notices — no API key needed.
// See: https://canadabuys.canada.ca/en/tender-opportunities
const CANADABUYS_CSV_URL =
  "https://canadabuys.canada.ca/opendata/pub/openTenderNotice-ouvertAvisAppelOffres.csv";

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const keyword = (searchParams.get("q") || "").toLowerCase();
  const category = searchParams.get("category");
  const region = searchParams.get("region");

  try {
    const csvRes = await fetch(CANADABUYS_CSV_URL, {
      // CanadaBuys updates this daily — cache briefly to avoid re-fetching a multi-MB file per request.
      next: { revalidate: 3600 },
    });

    if (!csvRes.ok) {
      throw new Error(`CanadaBuys feed returned ${csvRes.status}`);
    }

    const csvText = await csvRes.text();
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

    let rows = parsed.data;

    if (keyword) {
      rows = rows.filter((r) =>
        Object.values(r).some((v) => typeof v === "string" && v.toLowerCase().includes(keyword))
      );
    }
    if (category) {
      rows = rows.filter((r) => (r["Category"] || "").toLowerCase() === category.toLowerCase());
    }
    if (region) {
      rows = rows.filter((r) => (r["Region"] || "").toLowerCase().includes(region.toLowerCase()));
    }

    // Cap the payload — the raw feed can be large.
    rows = rows.slice(0, 200);

    return NextResponse.json({ count: rows.length, contracts: rows });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch CanadaBuys data.", detail: String(err) },
      { status: 502 }
    );
  }
}
