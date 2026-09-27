import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserFromRequest } from "@/lib/auth";

// ANTHROPIC_API_KEY is read from the server environment only — never sent to the browser.
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { contractId, contractSummary } = await req.json();
  if (!contractSummary) {
    return NextResponse.json({ error: "contractSummary is required." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: profile } = await db
    .from("company_profile")
    .select("*")
    .limit(1)
    .maybeSingle();

  const prompt = `You are drafting a formal Request for Proposal (RFP) response on behalf of Abiric,
a Canadian company whose motto is "Striving for Excellence".

COMPANY PROFILE:
${JSON.stringify(profile || {}, null, 2)}

TENDER / CONTRACT DETAILS:
${contractSummary}

Write a complete, formal, professional bid proposal addressed to the contracting authority.
Include: an executive summary, company qualifications, proposed approach/methodology,
timeline, and a closing statement. Use a confident, precise, Canadian business tone.
Do not invent specific dollar figures unless given in the company profile or contract details.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");

    await db.from("audit_log").insert({
      user_id: user.sub,
      action: "generate_rfp",
      details: { contractId },
    });

    return NextResponse.json({ rfp: text });
  } catch (err) {
    return NextResponse.json({ error: "RFP generation failed.", detail: String(err) }, { status: 500 });
  }
}
