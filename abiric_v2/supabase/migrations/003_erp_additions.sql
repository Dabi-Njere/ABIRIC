-- ============================================================
-- ABIRIC ERP ADDITIONS — additive/idempotent only.
--
-- Part A documents columns on tracked_contracts that are
-- already live in production (added outside of git history —
-- this migration exists so the schema is reproducible and no
-- longer undocumented drift). Safe to run even if already applied.
-- ============================================================

alter table tracked_contracts
  add column if not exists organization text,
  add column if not exists category text,
  add column if not exists region text,
  add column if not exists closing_date text,
  add column if not exists estimated_value numeric(14,2),
  add column if not exists tender_url text,
  add column if not exists updated_at timestamptz default now();

-- ============================================================
-- Part B — new, additive: explicit opportunity → contract link
-- and an awarded value on the contract itself, so "Contracts
-- Won" / "Total awarded value" can be read directly rather than
-- inferred. Nothing existing is modified or removed.
-- ============================================================

alter table contracts
  add column if not exists tracked_contract_id uuid references tracked_contracts(id),
  add column if not exists awarded_value numeric(14,2);

create index if not exists idx_contracts_tracked_contract on contracts(tracked_contract_id);

-- ============================================================
-- Part C — company settings for the Admin page. No existing
-- "company_profile" table was found in the live schema per the
-- inspection brief, so this is a new, single-purpose table
-- rather than resurrecting the old, unused concept.
-- ============================================================

create table if not exists company_settings (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null default 'ABIRIC INC.',
  operating_name text,
  address text,
  phone text,
  email text,
  business_number text,
  gst_hst_number text,
  default_tax_rate numeric(5,2) not null default 5.00,
  fiscal_year_end text,
  invoice_prefix text default 'INV-',
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id)
);

-- Seed exactly one row if the table is empty, so the Admin page
-- always has a single settings record to read/update.
insert into company_settings (legal_name)
select 'ABIRIC INC.'
where not exists (select 1 from company_settings);

-- ============================================================
-- Part D — explicit GST/HST capture. Per the brief: tax must be
-- stored explicitly, never guessed later from totals. These are
-- nullable additive columns; `amount` on both tables remains the
-- authoritative TOTAL used everywhere else in the app (Overview,
-- Ledger summary) so no existing reconciliation logic changes.
-- gst_hst_amount is an informational breakout of how much of that
-- total is tax — it is not added on top of `amount`.
-- Rows recorded before this migration will simply show $0 GST/HST
-- until re-entered with the breakout, rather than a guessed figure.
-- ============================================================

alter table direct_expenses
  add column if not exists payee text,
  add column if not exists gst_hst_amount numeric(14,2) default 0,
  add column if not exists receipt_reference text,
  add column if not exists payment_status text default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  add column if not exists payment_method text;

alter table invoices
  add column if not exists customer_name text,
  add column if not exists gst_hst_amount numeric(14,2) default 0;
