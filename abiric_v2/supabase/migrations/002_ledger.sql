-- ============================================================
-- ABIRIC LEDGER EXTENSION — migration on top of existing schema
-- Additive only. Does not touch users, tracked_contracts,
-- projects, expenses, company_profile, audit_log.
-- ============================================================

-- CONTRACTS is the ledger's primary spine. Every ledger line
-- references contract_id. Two lines of business: procurement
-- and consulting.
create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text unique not null,           -- human-facing contract ID
  title text not null,
  line text not null check (line in ('procurement', 'consulting')),
  client_name text,
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  tax_reserve_percent numeric(5,2) not null default 15.00,  -- editable, default 15%
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- SUPPLIER QUOTES — pre-purchase quotes tied to a contract.
-- Append-only: no update/delete route. A rejected/superseded
-- quote is marked via status, never rewritten.
create table if not exists supplier_quotes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id),
  supplier_name text not null,
  description text,
  quoted_amount numeric(14,2) not null,
  currency text not null default 'CAD',
  quote_date date not null default current_date,
  status text not null default 'received' check (status in ('received', 'accepted', 'rejected')),
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- PURCHASE LOTS — actual cost per lot, never weighted-averaged.
-- Each lot is its own cost record (specific identification).
-- Optionally traces back to the accepted quote it came from.
create table if not exists purchase_lots (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id),
  quote_id uuid references supplier_quotes(id),
  supplier_name text not null,
  description text,
  quantity numeric(14,3) not null,
  unit text,
  actual_unit_cost numeric(14,4) not null,
  actual_total_cost numeric(14,2) not null,        -- stored explicitly, not derived, to preserve the exact recorded figure
  purchase_date date not null default current_date,
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'partial', 'received')),
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- LOT DELIVERIES — append-only partial-delivery events against a lot.
-- Sum of delivered_quantity across rows vs. lots.quantity determines
-- delivery_status; never overwrite a prior delivery row.
create table if not exists lot_deliveries (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references purchase_lots(id),
  contract_id uuid not null references contracts(id),
  delivered_quantity numeric(14,3) not null,
  delivery_date date not null default current_date,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- DIRECT EXPENSES — costs charged straight to a contract.
-- No overhead allocation logic anywhere: these are the only
-- non-purchase-lot costs, and they are summed as-recorded.
create table if not exists direct_expenses (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id),
  category text not null,
  description text,
  amount numeric(14,2) not null,
  expense_date date not null default current_date,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- FINANCING — loans/advances/LCs tied to a contract.
create table if not exists financing (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id),
  provider text not null,
  financing_type text not null,        -- e.g. 'loan', 'advance', 'letter_of_credit'
  amount numeric(14,2) not null,
  interest_rate numeric(6,3),
  start_date date not null default current_date,
  terms text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- INVOICES — billed to the client. Status is derived at read time
-- from linked payments, not mutated in place.
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id),
  invoice_number text not null,
  amount numeric(14,2) not null,
  invoice_date date not null default current_date,
  due_date date,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- PAYMENTS — money moving in (client payments against invoices) or
-- out (payments to suppliers/financiers). Append-only ledger lines.
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id),
  invoice_id uuid references invoices(id),     -- null for outbound/supplier/financing payments
  direction text not null check (direction in ('inbound', 'outbound')),
  amount numeric(14,2) not null,
  payment_date date not null default current_date,
  method text,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_quotes_contract on supplier_quotes(contract_id);
create index if not exists idx_lots_contract on purchase_lots(contract_id);
create index if not exists idx_lots_quote on purchase_lots(quote_id);
create index if not exists idx_deliveries_lot on lot_deliveries(lot_id);
create index if not exists idx_expenses_contract on direct_expenses(contract_id);
create index if not exists idx_financing_contract on financing(contract_id);
create index if not exists idx_invoices_contract on invoices(contract_id);
create index if not exists idx_payments_contract on payments(contract_id);
create index if not exists idx_payments_invoice on payments(invoice_id);
