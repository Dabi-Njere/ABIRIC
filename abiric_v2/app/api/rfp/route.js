import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

// AI is optional and text-only: tender/contract summarization or
// proposal drafting. It never computes a ledger figure and never
// fetches or looks anything up — the caller must supply all the
// text it needs (sourceText) in the request body. If no
// ANTHROPIC_API_KEY is configured, this route degrades gracefully
// instead of failing the build or blocking the rest of the app.

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "sk-ant-REPLACE_ME") {
    return NextResponse.json(
      {
        available: false,
        message:
          "AI drafting is not configured. This is optional — the rest of Abiric (contracts, quotes, lots, expenses, financing, invoices, payments) works fully without it.",
      },
      { status: 200 }
    );
  }

  const { mode, sourceText } = await req.json();
  if (!sourceText) {
    return NextResponse.json({ error: "sourceText is required." }, { status: 400 });
  }
  if (!["summarize", "draft"].includes(mode)) {
    return NextResponse.json({ error: "mode must be 'summarize' or 'draft'." }, { status: 400 });
  }

  const instruction =
    mode === "summarize"
      ? "Summarize the following tender/contract text for a busy reviewer. Plain prose, no invented figures, no calculations — just what the source text says."
      : "Draft a formal proposal response based on the following tender details, in a confident, precise, Canadian business tone. Do not invent dollar figures — use only numbers present in the source text.";

  try {
    // Lazy import so the SDK is only touched when actually invoked with a key.
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: `${instruction}\n\n---\n\n${sourceText}` }],
    });

    const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    return NextResponse.json({ available: true, result: text });
  } catch (err) {
    return NextResponse.json(
      { available: false, error: "AI request failed.", detail: String(err) },
      { status: 200 }
    );
  }
}
