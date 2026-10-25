-- KithaLovers Stage 21: private profile verification and administrator review.
-- Run in Supabase SQL Editor AFTER the Stage 20 migration.

create table if not exists public.profile_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  evidence_path text not null,
  evidence_type text not null default 'government_id' check (evidence_type in ('government_id', 'selfie_with_id', 'other')),
  member_note text check (member_note is null or char_length(member_note) <= 500),
  admin_review_reason text check (admin_review_reason is null or char_length(admin_review_reason) <= 500),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint verification_review_fields_consistent check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null and admin_review_reason is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null and admin_review_reason is not null)
  )
);

create index if not exists profile_verification_requests_user_created_idx
  on public.profile_verification_requests (user_id, created_at desc);
create index if not exists profile_verification_requests_status_created_idx
  on public.profile_verification_requests (status, created_at desc);
create unique index if not exists profile_verification_one_pending_per_user_idx
  on public.profile_verification_requests (user_id) where status = 'pending';

alter table public.profile_verification_requests enable row level security;
revoke all on public.profile_verification_requests from anon, authenticated;
grant select, insert on public.profile_verification_requests to authenticated;
grant update (status, admin_review_reason, reviewed_by, reviewed_at) on public.profile_verification_requests to authenticated;

 drop policy if exists "Members read own verification requests or admins read all" on public.profile_verification_requests;
create policy "Members read own verification requests or admins read all"
  on public.profile_verification_requests for select to authenticated
  using (user_id = (select auth.uid()) or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Members submit own pending verification requests" on public.profile_verification_requests;
create policy "Members submit own pending verification requests"
  on public.profile_verification_requests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and admin_review_reason is null
    and evidence_path like user_id::text || '/%'
  );

drop policy if exists "Only admins update verification decisions" on public.profile_verification_requests;
create policy "Only admins update verification decisions"
  on public.profile_verification_requests for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.guard_profile_verification_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.user_id is distinct from auth.uid()
       or new.status <> 'pending'
       or new.reviewed_by is not null
       or new.reviewed_at is not null
       or new.admin_review_reason is not null
       or new.evidence_path not like new.user_id::text || '/%' then
      raise exception 'Members may only submit their own pending verification request.';
    end if;
    return new;
  end if;
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Only an administrator can review verification requests.';
  end if;
  if old.status <> 'pending' then
    raise exception 'This verification request has already been reviewed.';
  end if;
  if new.user_id is distinct from old.user_id
     or new.evidence_path is distinct from old.evidence_path
     or new.evidence_type is distinct from old.evidence_type
     or new.member_note is distinct from old.member_note
     or new.created_at is distinct from old.created_at
     or new.id is distinct from old.id then
    raise exception 'Reviewers cannot change the submitted request or evidence.';
  end if;
  if new.status not in ('approved', 'rejected')
     or new.reviewed_by is distinct from auth.uid()
     or new.reviewed_by is null
     or new.reviewed_at is null
     or length(trim(coalesce(new.admin_review_reason, ''))) < 3 then
    raise exception 'A decision, reviewer, timestamp, and review note are required.';
  end if;
  if new.status = 'approved' then
    update public.profiles set verified_at = new.reviewed_at, updated_at = now() where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_verification_request on public.profile_verification_requests;
create trigger guard_profile_verification_request
  before insert or update on public.profile_verification_requests
  for each row execute function public.guard_profile_verification_request();

alter table public.profiles add column if not exists verified_at timestamptz;
grant update (verified_at) on public.profiles to authenticated;

create or replace function public.guard_profile_verified_at()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.verified_at is distinct from old.verified_at
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Only an administrator can change profile verification status.';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_profile_verified_at on public.profiles;
create trigger guard_profile_verified_at before update on public.profiles
  for each row execute function public.guard_profile_verified_at();

-- Create a private bucket. Files are not publicly accessible and signed links expire quickly.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-evidence', 'verification-evidence', false, 8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

drop policy if exists "Members upload verification evidence to own folder" on storage.objects;
create policy "Members upload verification evidence to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Owners and admins read private verification evidence" on storage.objects;
create policy "Owners and admins read private verification evidence"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-evidence'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    )
  );

-- Evidence is intentionally not granted public access. Only the owner and trusted admins can read it.
