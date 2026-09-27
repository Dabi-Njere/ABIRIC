# Abiric — Next.js 14 PWA

Canadian government contract intelligence platform. Rebuilt from the original
React/Vite/Express app on Replit into a Next.js 14 App Router PWA for Vercel,
connected to the **same existing Supabase project**.

## ⚠️ Before you do anything else
This repo's `.env.local` contains real, live credentials (Supabase service role
key, JWT secret, default admin password). **Do not commit `.env.local` to
GitHub** (it's already in `.gitignore`) and do not paste it into any third-party
tool. If it's already been shared anywhere outside your own machine/Vercel
dashboard, rotate the Supabase service role key and change the admin password
immediately.

## 1. Install
```bash
npm install
```

## 2. Environment variables
`.env.local` is already filled in with your existing Supabase project. You
still need to add your own Anthropic API key (from console.anthropic.com) in
place of `sk-ant-REPLACE_ME`.

## 3. Run locally
```bash
npm run dev
```
Visit http://localhost:3000 — you'll be redirected to `/login`.

## 4. Expected Supabase schema
These tables should already exist (per your original build). If any are
missing, recreate with roughly this shape:

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  name text,
  is_admin boolean default false,
  role text default 'Analyst',
  permissions jsonb default '{}',
  created_at timestamptz default now()
);

create table tracked_contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  bid_id text unique,
  title text,
  reference_number text,
  raw_data jsonb,
  stage text default 'New',
  notes text,
  created_at timestamptz default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contract_id uuid references tracked_contracts(id),
  revenue numeric default 0,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  category text,
  amount numeric,
  description text,
  date date,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table company_profile (
  id uuid primary key default gen_random_uuid(),
  company_name text default 'Abiric',
  tagline text default 'Striving for Excellence',
  address text,
  contact_email text,
  contact_phone text,
  capabilities text,
  past_performance text,
  updated_at timestamptz default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  action text,
  details jsonb,
  created_at timestamptz default now()
);
```

Seed the default admin (hash `Admin@2024` with bcrypt before inserting —
don't store it in plain text in the real table):

```sql
insert into users (email, password_hash, name, is_admin, role, permissions)
values (
  'admin@abiric.ca',
  '<bcrypt hash of Admin@2024>',
  'Admin',
  true,
  'Admin',
  '{"contracts": true, "rfp": true, "pipeline": true, "accounting": true, "admin": true}'
);
```

## 5. Deploy to Vercel
1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add the environment variables from `.env.local` in Vercel → Settings →
   Environment Variables (do this manually — the file itself is never
   uploaded).
4. Deploy. Vercel will auto-deploy on every push to `main`.

## 6. PWA install
Once deployed on HTTPS (Vercel gives you this automatically), visit the site
on a phone and use "Add to Home Screen" (iOS Safari) or the install prompt
(Chrome Android/desktop). The service worker (`public/sw.js`) caches the app
shell and API responses for offline use.

## What's implemented vs. stubbed
| Feature | Status |
|---|---|
| Login / register / JWT auth | ✅ working API routes |
| CanadaBuys discovery + track | ✅ working API routes + page |
| RFP generator (Claude API) | ✅ working API route + page |
| Pipeline stage updates | ✅ API route (`PATCH /api/contracts/[id]`); board UI is a layout stub — wire up drag/drop and a list fetch |
| Accounting (projects/expenses) | ✅ API routes; charts/forms UI is a stub |
| Admin panel | 🔲 UI stub — user management, permission toggles, audit log viewer to be built against existing tables |
| PWA (manifest, service worker, offline page, install) | ✅ working |
| Push notifications | ✅ service worker listener in place; needs a push subscription flow + server-side sender wired to your alerting logic |

## Icons
`public/icons/icon-192.png` and `icon-512.png` are simple placeholder
geometric marks in the brand colors — swap in the real Abiric logo SVG
exported to PNG at those sizes.
