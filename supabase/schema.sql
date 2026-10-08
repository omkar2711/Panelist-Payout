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
  default_rate numeric(10, 2) not null default 0,
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
  candidate_ref text,
  notes text,
  status entry_status not null default 'submitted',
  rate_applied numeric(10, 2),
  amount numeric(10, 2),
  approved_by uuid references profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

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
-- changes never retroactively change an already-approved entry.
create or replace function lock_entry_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    if new.rate_applied is null then
      select default_rate into new.rate_applied from panelists where id = new.panelist_id;
    end if;
    new.amount := new.rate_applied;
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
create view panelist_balances as
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

-- Atomically records a vendor payment against a set of approved entries.
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
begin
  if not is_vendor() then
    raise exception 'only the vendor can record payments';
  end if;

  insert into payments (panelist_id, amount, paid_on, mode, reference, notes, created_by)
  values (p_panelist_id, p_amount, p_paid_on, p_mode, p_reference, p_notes, auth.uid())
  returning id into v_payment_id;

  insert into payment_entries (payment_id, entry_id)
  select v_payment_id, unnest(p_entry_ids);

  update interview_entries
  set status = 'paid'
  where id = any(p_entry_ids)
    and panelist_id = p_panelist_id
    and status = 'approved';

  return v_payment_id;
end;
$$;

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

create policy "panelist inserts own entries" on interview_entries
  for insert with check (panelist_id = auth.uid() and status = 'submitted');

create policy "vendor updates entries" on interview_entries
  for update using (is_vendor()) with check (true);

-- A panelist can only revoke a mistaken entry before the vendor has acted on
-- it; once approved or rejected it's part of the record and locked.
create policy "panelist revokes own submitted entries" on interview_entries
  for delete using (panelist_id = auth.uid() and status = 'submitted');

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
