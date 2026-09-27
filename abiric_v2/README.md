# Abiric — Next.js 14 PWA + Transaction-Driven Ledger

This is the same Abiric app from the previous build, **extended, not rebuilt**,
with a contract-ID-keyed procurement/consulting ledger added on top of the
existing auth/Supabase/PWA shell.

## ⚠️ Before you do anything else
`.env.local` contains real, live credentials (Supabase service role key, JWT
secret). Don't commit it, don't paste it anywhere outside your own machine or
the Vercel dashboard.

---

## Audit summary (what I found in the prior zip)

- Auth, Supabase clients, PWA shell (manifest/service worker/offline page),
  CanadaBuys discovery, and generic `tracked_contracts`/`projects`/`expenses`
  tables were present and reusable — kept as-is.
- **No ledger model existed at all**: no contract-ID spine, no supplier
  quotes, no purchase lots, no actual-cost tracking, no financing, no
  invoices, no payments, no tax reserve. This has all been added net-new.
- **The RFP generator had a hard `ANTHROPIC_API_KEY` dependency** (route
  would throw without one). Rewritten to degrade gracefully and renamed
  conceptually to optional text-only "AI Drafting" — summarization/drafting
  only, never math, never data retrieval.
- **Missing `jsconfig.json`.** The previous zip used `@/lib/...` imports
  everywhere but never defined the `@/` path alias — the app would not have
  built at all. Added.
- **Middleware pulled in `jsonwebtoken`,** which depends on Node's `crypto`
  module. Next.js middleware runs on Vercel's Edge Runtime, which doesn't
  support that — this would very likely have broken auth checks in
  production even though it appeared to build. Split middleware onto `jose`
  (Edge-compatible) for verification only; `jsonwebtoken` stays in the actual
  Node.js API routes (login/register), where it's fine.
- **Next.js was pinned to 14.2.5**, which npm flags as having a known
  security advisory. Bumped to the latest patched 14.2.x (14.2.35).

## What was added

### Ledger (new)
A transaction-driven ledger keyed on `contract_id`, with two lines of
business (`procurement` / `consulting`) set per contract.

| Table | Purpose |
|---|---|
| `contracts` | The primary spine. `contract_number`, `title`, `line`, `client_name`, `status`, editable `tax_reserve_percent` (default 15). |
| `supplier_quotes` | Pre-purchase quotes tied to a contract. Append-only. |
| `purchase_lots` | **Actual cost per lot** — `actual_total_cost` is stored exactly as entered, never re-derived or blended into a weighted average across lots. Optionally traces back to the quote it came from. |
| `lot_deliveries` | Append-only partial-delivery events against a lot. A lot's `pending`/`partial`/`received` status is *derived* from these events, never a manually-set flag. |
| `direct_expenses` | Costs charged straight to a contract (freight, customs, etc.) — no overhead allocation anywhere in the system. |
| `financing` | Loans/advances/letters of credit tied to a contract. |
| `invoices` | Billed to the client. Paid status is *derived* from linked payments, never stored/mutated directly. |
| `payments` | Inbound (client payments) or outbound (supplier/financing payments), optionally linked to an invoice. |

Migration: `supabase/migrations/002_ledger.sql` — additive only, doesn't touch
any existing table.

**Source history is kept intact by design**: every ledger table above only
has `GET`/`POST` routes — no `PATCH`/`DELETE`. The one exception is
`contracts` itself, where a small set of administrative fields (title,
status, tax reserve %, notes) can be edited, and every such edit is written
to `audit_log` with the old and new values, so even that trail survives.

**No overhead allocation, anywhere**: `lib/ledger.js` sums purchase-lot
actual costs + direct expenses + financing directly. There is no split, no
percentage-of-revenue allocation, no indirect-cost pool. See
`contractSummary()`.

### Contract summary & tax reserve
`GET /api/ledger/summary/[contractId]` returns the full rollup: quoted
total, actual purchase cost, direct expenses, financing, total cost,
invoiced, paid in/out, outstanding receivable, gross before tax, the
contract's tax reserve % (editable, defaults to 15 if unset), the computed
tax reserve amount, and net after tax reserve.

### AI (optional, text-only)
`POST /api/rfp` now:
- Returns `{ available: false, message: "..." }` (HTTP 200, not an error)
  when no `ANTHROPIC_API_KEY` is configured — the rest of the app is
  entirely unaffected.
- When a key is configured, only does `summarize` or `draft` on text you
  supply in `sourceText`. It never queries the ledger, never fetches
  anything, and is never used to produce a number.

### UI
- `/dashboard/ledger` — create/list contracts (procurement/consulting)
- `/dashboard/ledger/[contractId]` — the full ledger detail: live summary
  rollup, editable tax reserve %, and add-forms for quotes, purchase lots
  (with a partial-delivery recorder per lot), direct expenses, financing,
  invoices, and payments
- `/dashboard/rfp` — reworked into the optional AI drafting/summarize tool
- Nav updated; old `/dashboard/accounting` and `/dashboard/pipeline` pages
  kept as-is, relabeled "Legacy Accounting" / "Pipeline" (untouched, not part
  of this extension)

---

## Verification performed in this environment

I don't have network access to your live Supabase project or Vercel from
this sandbox, so a true live end-to-end run (real login → real DB writes)
isn't something I could execute here. What I *did* verify:

1. **`npm install`** — clean install, ~196 packages, no errors.
2. **`npm run build`** — full Next.js production build, **27/27 routes
   compiled successfully**, including every new `/api/ledger/*` route and
   the ledger UI pages. (This is what surfaced the missing `jsconfig.json`
   and the middleware Edge Runtime problem, both now fixed — the first
   build attempt genuinely failed before those fixes.)
3. **`node scripts/test-ledger.mjs`** — an end-to-end run of the ledger math
   against representative data: two purchase lots at *different* actual unit
   costs (confirming they're summed, not averaged), a partial delivery, two
   direct expenses, a financing line, an invoice with a partial payment, and
   a non-default tax reserve percentage. **17/17 assertions pass**,
   including the derived lot delivery status, derived invoice paid status,
   and the default-15%-tax-reserve fallback. Run it yourself:
   ```bash
   node scripts/test-ledger.mjs
   ```

**What's not yet verified because it requires your live environment:**
your actual Supabase project (login flow, real inserts/selects, RLS if you
have any enabled), and an actual Vercel deploy. Once you run `npm run dev`
locally against your real `.env.local` or deploy to Vercel, walk through:
create a contract → add a quote → convert it to a purchase lot → record a
partial delivery → log a direct expense → add financing → create an invoice
→ record a partial payment → confirm the summary panel's tax reserve and net
figures match hand math. That's the one step I can't do for you from here.

---

## Setup (unchanged from before)

```bash
npm install
npm run dev
```

Add your Anthropic key to `.env.local` if you want AI drafting — it's
optional, everything else works without it.

Apply `supabase/migrations/002_ledger.sql` in the Supabase SQL editor before
using the Ledger tab (existing tables are untouched).

Deploy: push to GitHub → import in Vercel → add the env vars from
`.env.local` in Vercel's dashboard → deploy.
