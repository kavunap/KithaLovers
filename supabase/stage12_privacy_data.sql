-- KithaLovers Stage 12: privacy export support and account-deletion requests.
-- Run once in Supabase SQL Editor AFTER the existing Stage 11 project migrations.
-- This migration records requests; it does NOT delete auth.users or associated data.

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text null check (reason is null or char_length(reason) <= 1000),
  status text not null default 'pending'
    check (status in ('pending', 'reviewing', 'completed', 'rejected')),
  admin_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz null
);

create index if not exists account_deletion_requests_user_created_idx
  on public.account_deletion_requests (user_id, created_at desc);
create index if not exists account_deletion_requests_status_created_idx
  on public.account_deletion_requests (status, created_at desc);

-- Avoid duplicate open requests from the same account.
create unique index if not exists account_deletion_one_open_request_per_user_idx
  on public.account_deletion_requests (user_id)
  where status in ('pending', 'reviewing');

alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from anon, authenticated;
grant select on public.account_deletion_requests to authenticated;
grant insert (user_id, reason) on public.account_deletion_requests to authenticated;
grant update (status, admin_notes, processed_at, updated_at)
  on public.account_deletion_requests to authenticated;

drop policy if exists "Members read own deletion requests or admins read all" on public.account_deletion_requests;
create policy "Members read own deletion requests or admins read all"
  on public.account_deletion_requests for select to authenticated
  using (
    user_id = (select auth.uid())
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Members submit own deletion requests" on public.account_deletion_requests;
create policy "Members submit own deletion requests"
  on public.account_deletion_requests for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Admins process deletion requests" on public.account_deletion_requests;
create policy "Admins process deletion requests"
  on public.account_deletion_requests for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.set_account_deletion_request_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  if new.status in ('completed', 'rejected') and old.status is distinct from new.status then
    new.processed_at = now();
  elsif new.status in ('pending', 'reviewing') then
    new.processed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_account_deletion_request_updated_at on public.account_deletion_requests;
create trigger set_account_deletion_request_updated_at
before update on public.account_deletion_requests
for each row execute function public.set_account_deletion_request_updated_at();

comment on table public.account_deletion_requests is
  'Tracks account deletion requests for trusted administrator processing; this table does not delete accounts automatically.';
