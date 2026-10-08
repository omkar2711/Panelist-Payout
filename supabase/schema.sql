-- Panelist Payout Manager — database schema
-- Run this once in the Supabase SQL editor for a fresh project.

create extension if not exists pgcrypto;

create type user_role as enum ('vendor', 'panelist');
create type entry_status as enum ('submitted', 'approved', 'rejected', 'paid');

-- One row per authenticated user (both vendor and panelists).
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- Panelist-specific fields. id == profiles.id for panelist users.
create table panelists (
  id uuid primary key references profiles (id) on delete cascade,
  phone text,
  -- What this panelist is paid per approved interview, by interview length.
  rate_60 numeric(10, 2) not null default 1000,
  rate_90 numeric(10, 2) not null default 1500,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table interview_entries (
  id uuid primary key default gen_random_uuid(),
  panelist_id uuid not null references panelists (id) on delete cascade,
  interview_date date not null,
  start_time time,
  duration_minutes int,
  interview_type text,
  -- How the interview turned out; decides what share of the rate is paid.
  outcome text not null default 'completed' check (
    outcome in ('completed', 'partial', 'student_no_show', 'interviewer_no_show', 'wrong_interview')
  ),
  candidate_ref text,
  notes text,
  status entry_status not null default 'submitted',
  rate_applied numeric(10, 2),
  amount numeric(10, 2),
  approved_by uuid references profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- One panelist can't have two live entries for the same date and start time.
create unique index interview_entries_no_duplicates
  on interview_entries (panelist_id, interview_date, start_time)
  where status <> 'rejected';

create table payments (
  id uuid primary key default gen_random_uuid(),
  panelist_id uuid not null references panelists (id) on delete cascade,
  amount numeric(10, 2) not null,
  paid_on date not null default current_date,
  mode text,
  reference text,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table payment_entries (
  payment_id uuid not null references payments (id) on delete cascade,
  entry_id uuid not null references interview_entries (id) on delete cascade,
  primary key (payment_id, entry_id)
);

create table payout_batches (
  id uuid primary key default gen_random_uuid(),
  amount numeric(10, 2) not null,
  received_on date not null default current_date,
  period_label text,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- Locks the rate/amount at the moment an entry is approved, so later rate
-- changes never retroactively change an already-approved entry. The rate is
-- the panelist's 90-minute rate for 90-minute interviews, otherwise their
-- 60-minute rate. The amount is that rate times the share paid for the
-- interview's outcome (the same percentages as INTERVIEW_OUTCOMES in
-- src/lib/interview-rates.ts), unless the vendor supplied an amount.
create or replace function lock_entry_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    if new.rate_applied is null then
      select case when new.duration_minutes = 90 then rate_90 else rate_60 end
        into new.rate_applied
        from panelists where id = new.panelist_id;
    end if;
    if new.amount is null then
      new.amount := round(
        new.rate_applied * (case new.outcome
          when 'completed' then 100
          when 'partial' then 50
          when 'student_no_show' then 30
          else 0
        end) / 100.0, 2);
    end if;
    new.approved_at := now();
    new.approved_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger trg_lock_entry_rate
  before update on interview_entries
  for each row execute function lock_entry_rate();

-- Per-panelist running balance: approved-but-unpaid = amount currently owed.
-- security_invoker makes the view obey the caller's row-level security: the
-- vendor sees everyone, a panelist only their own row. Without it a view runs
-- with its owner's rights and would expose every panelist's balance.
create view panelist_balances with (security_invoker = true) as
select
  p.id as panelist_id,
  pr.full_name,
  pr.email,
  p.active,
  coalesce(sum(ie.amount) filter (where ie.status = 'approved'), 0) as amount_due,
  coalesce(sum(ie.amount) filter (where ie.status = 'paid'), 0) as amount_paid,
  count(ie.id) filter (where ie.status = 'submitted') as pending_review_count,
  count(ie.id) filter (where ie.status in ('approved', 'paid')) as approved_interview_count
from panelists p
join profiles pr on pr.id = p.id
left join interview_entries ie on ie.panelist_id = p.id
group by p.id, pr.full_name, pr.email, p.active;

revoke all on panelist_balances from anon;

-- Atomically records a vendor payment against a set of approved entries.
-- Every listed interview must be approved, unpaid and belong to that panelist;
-- and the amount must equal their total; otherwise nothing is recorded. The
-- row locks stop two simultaneous requests
-- (a double-click, two open tabs) from paying the same interviews twice.
create or replace function record_payment(
  p_panelist_id uuid,
  p_amount numeric,
  p_paid_on date,
  p_mode text,
  p_reference text,
  p_notes text,
  p_entry_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_wanted int;
  v_payable int;
begin
  if not is_vendor() then
    raise exception 'only the vendor can record payments';
  end if;

  select count(distinct x) into v_wanted from unnest(p_entry_ids) as x;
  if v_wanted = 0 then
    raise exception 'choose at least one interview to pay';
  end if;

  perform 1 from interview_entries where id = any(p_entry_ids) for update;
  select count(*) into v_payable
  from interview_entries
  where id = any(p_entry_ids)
    and panelist_id = p_panelist_id
    and status = 'approved';
  if v_payable <> v_wanted then
    raise exception 'some of these interviews are already paid, not approved, or belong to another panelist';
  end if;

  if p_amount is distinct from (
    select coalesce(sum(amount), 0) from interview_entries where id = any(p_entry_ids)
  ) then
    raise exception 'the payment amount must equal the total of the selected interviews';
  end if;

  insert into payments (panelist_id, amount, paid_on, mode, reference, notes, created_by)
  values (p_panelist_id, p_amount, p_paid_on, p_mode, p_reference, p_notes, auth.uid())
  returning id into v_payment_id;

  insert into payment_entries (payment_id, entry_id)
  select v_payment_id, x from (select distinct unnest(p_entry_ids) as x) ids;

  update interview_entries
  set status = 'paid'
  where id = any(p_entry_ids)
    and panelist_id = p_panelist_id
    and status = 'approved';

  return v_payment_id;
end;
$$;

-- Leaderboard: the only place a panelist can see other panelists, and it
-- exposes just a name and a count (never amounts, emails or entry details).
-- "Approved" includes paid entries, since those were approved first, but not
-- interviewer no-shows or wrong interviews (the outcomes paid at 0%).
-- Returns all-time, this-month, last-month and last-90-day counts so the app
-- can show a monthly board, rank movement and recognition tiers.
create or replace function get_leaderboard()
returns table (
  panelist_id uuid,
  full_name text,
  approved_count bigint,
  month_count bigint,
  last_month_count bigint,
  recent_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  -- Months and the 90-day window follow India time.
  with today as (select (now() at time zone 'Asia/Kolkata')::date as d)
  select p.id, pr.full_name,
         count(ie.id),
         count(ie.id) filter (where ie.interview_date >= date_trunc('month', t.d)::date),
         count(ie.id) filter (
           where ie.interview_date >= (date_trunc('month', t.d) - interval '1 month')::date
             and ie.interview_date < date_trunc('month', t.d)::date
         ),
         count(ie.id) filter (where ie.interview_date > t.d - 90)
  from panelists p
  join profiles pr on pr.id = p.id
  cross join today t
  left join interview_entries ie
    on ie.panelist_id = p.id
   and ie.status in ('approved', 'paid')
   and ie.outcome not in ('interviewer_no_show', 'wrong_interview')
  where p.active
    and exists (select 1 from profiles me where me.id = auth.uid())
  group by p.id, pr.full_name
  order by 3 desc, pr.full_name;
$$;

revoke execute on function get_leaderboard() from public, anon;
grant execute on function get_leaderboard() to authenticated;

-- Row level security -----------------------------------------------------

create or replace function is_vendor()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'vendor'
  );
$$;

alter table profiles enable row level security;
alter table panelists enable row level security;
alter table interview_entries enable row level security;
alter table payments enable row level security;
alter table payment_entries enable row level security;
alter table payout_batches enable row level security;

create policy "read own profile or vendor reads all" on profiles
  for select using (id = auth.uid() or is_vendor());

create policy "vendor manages profiles" on profiles
  for all using (is_vendor()) with check (is_vendor());

create policy "panelist reads own row" on panelists
  for select using (id = auth.uid() or is_vendor());

create policy "vendor manages panelists" on panelists
  for insert with check (is_vendor());

create policy "vendor updates panelists" on panelists
  for update using (is_vendor()) with check (is_vendor());

create policy "panelist reads own entries" on interview_entries
  for select using (panelist_id = auth.uid() or is_vendor());

-- What a panelist may log: their own entry, awaiting approval, with a start
-- time, a 60 or 90 minute slot, not dated in the future (India time), and only
-- while their account is active.
create policy "panelist inserts own entries" on interview_entries
  for insert with check (
    panelist_id = auth.uid()
    and status = 'submitted'
    and start_time is not null
    and duration_minutes in (60, 90)
    and interview_date <= (now() at time zone 'Asia/Kolkata')::date
    and exists (select 1 from panelists p where p.id = auth.uid() and p.active)
  );

create policy "vendor updates entries" on interview_entries
  for update using (is_vendor()) with check (true);

-- A panelist can only revoke a mistaken entry before the vendor has acted on
-- it; once approved or rejected it's part of the record and locked.
create policy "panelist revokes own submitted entries" on interview_entries
  for delete using (panelist_id = auth.uid() and status = 'submitted');

-- The vendor can remove any entry that hasn't been paid. Paid entries are tied
-- to a recorded payment, so they stay as the audit trail.
create policy "vendor deletes unpaid entries" on interview_entries
  for delete using (is_vendor() and status <> 'paid');

create policy "panelist reads own payments" on payments
  for select using (panelist_id = auth.uid() or is_vendor());

create policy "vendor manages payments" on payments
  for insert with check (is_vendor());

create policy "panelist reads own payment_entries" on payment_entries
  for select using (
    exists (
      select 1 from payments
      where payments.id = payment_entries.payment_id
        and (payments.panelist_id = auth.uid() or is_vendor())
    )
  );

create policy "vendor reads payout batches" on payout_batches
  for select using (is_vendor());

create policy "vendor manages payout batches" on payout_batches
  for insert with check (is_vendor());

-- Auto-create a profiles row whenever a new panelist auth user is created
-- via the admin API (see src/lib/supabase/admin.ts + the "add panelist" flow).
-- The vendor's own profile row is inserted manually once, per the README.
