# ExpertBench — Panelist Payout Manager

Tracks interviews conducted by external panelists and what's owed to each of
them, with separate logins for the vendor (admin) and each panelist.

## Stack

Next.js 16 (App Router) + Supabase (Postgres, Auth, Row Level Security) +
Recharts, styled with Tailwind CSS.

## One-time setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (the
   free tier is enough for under ~20 panelists).
2. **Run the schema**: open the SQL editor in your Supabase project and run
   the contents of [`supabase/schema.sql`](supabase/schema.sql). This creates
   all tables, the approval-locking trigger, the balances view, the payment
   RPC, and Row Level Security policies.
3. **Copy environment variables**: `cp .env.local.example .env.local` and
   fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` from Project Settings → API in Supabase.
4. **Create your own vendor account** (one-time, manual — there's no vendor
   signup screen by design):
   - In the Supabase dashboard, go to Authentication → Users → Add user, and
     create a user with your email and a password.
   - In the SQL editor, run:
     ```sql
     insert into profiles (id, role, full_name, email)
     values ('<the new user''s UUID from the Users tab>', 'vendor', 'Your Name', 'you@example.com');
     ```
5. **Install dependencies and run**:
   ```bash
   npm install
   npm run dev
   ```
   Sign in at `http://localhost:3000/login` with the vendor account you just
   created.

## Adding panelists

Once signed in as the vendor, go to **Panelists → Add panelist**. This creates
their login account (via the Supabase service role key, server-side only) and
shows a one-time temporary password — share that with the panelist directly
so they can sign in and change it.

## How the numbers work

1. A panelist logs an interview (date, time, type) — status `submitted`.
2. The vendor reviews it under **Approvals** and approves or rejects it. On
   approval, the panelist's current rate is locked into that entry
   permanently, so later rate changes never retroactively change it.
3. Approved-but-unpaid entries make up the "amount due" shown on both
   dashboards.
4. When the vendor records a payment, they pick which approved entries it
   covers; those entries flip to `paid` and drop out of the amount due.

## Project structure

- `supabase/schema.sql` — the entire database schema, RLS policies, and the
  `record_payment` function. This is the source of truth for the data model.
- `src/app/vendor/*` — vendor dashboard, panelist management, approvals,
  payments.
- `src/app/panelist/*` — panelist dashboard and interview logging.
- `src/lib/supabase/` — browser client, server client (cookie-based session),
  and the admin client (service role, server-only) used to create panelist
  accounts.
- `src/proxy.ts` — refreshes the Supabase session on every request and
  redirects unauthenticated visitors away from `/vendor` and `/panelist`
  (Next.js 16 renamed `middleware.ts` to `proxy.ts`).
