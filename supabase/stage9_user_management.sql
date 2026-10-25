-- KithaLovers Stage 9: administrator user management and suspension enforcement.
-- Run once AFTER Stage 8. Never grant admin through browser-side code.

alter table public.profiles add column if not exists is_suspended boolean not null default false;
alter table public.profiles add column if not exists suspension_reason text;
alter table public.profiles add column if not exists suspended_at timestamptz;

-- Only admins can see all profiles (Stage 8 already establishes this policy).
drop policy if exists "Admins read profiles for moderation" on public.profiles;
create policy "Admins read profiles for moderation" on public.profiles
for select to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Preserve owner profile editing while preventing owners from changing moderation fields.
revoke update on public.profiles from authenticated;
grant update (display_name, birth_date, bio, city, country, intent, gender, interested_in, is_visible, photo_url, updated_at) on public.profiles to authenticated;
grant update (is_suspended, suspension_reason, suspended_at, updated_at) on public.profiles to authenticated;

-- Use a trigger to ensure only trusted admin JWTs can modify suspension fields.
create or replace function public.guard_suspension_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.is_suspended is distinct from old.is_suspended
      or new.suspension_reason is distinct from old.suspension_reason
      or new.suspended_at is distinct from old.suspended_at)
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Only an administrator can change account suspension status.';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_profile_suspension_fields on public.profiles;
create trigger guard_profile_suspension_fields before update on public.profiles
for each row execute function public.guard_suspension_fields();

-- Shared write guard. A suspended member cannot edit their profile or create
-- connection requests, messages, or reports. Admins are not blocked by this guard.
create or replace function public.reject_suspended_member_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' then
    return new;
  end if;
  if exists (select 1 from public.profiles p where p.id = v_user and p.is_suspended) then
    raise exception 'This account is suspended. Contact KithaLovers support if you believe this is a mistake.';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_suspended_profile_edit on public.profiles;
create trigger reject_suspended_profile_edit before update on public.profiles
for each row when (old.id = auth.uid()) execute function public.reject_suspended_member_write();
drop trigger if exists reject_suspended_request_write on public.connection_requests;
create trigger reject_suspended_request_write before insert or update on public.connection_requests
for each row execute function public.reject_suspended_member_write();
drop trigger if exists reject_suspended_message_write on public.messages;
create trigger reject_suspended_message_write before insert or update on public.messages
for each row execute function public.reject_suspended_member_write();
drop trigger if exists reject_suspended_report_write on public.reports;
create trigger reject_suspended_report_write before insert on public.reports
for each row execute function public.reject_suspended_member_write();

-- Existing matching RPC must also reject a suspended recipient accepting a request.
create or replace function public.respond_to_connection_request(p_request_id uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.connection_requests%rowtype;
  v_match_id uuid;
  v_blocked boolean;
  v_visible boolean;
begin
  if v_user_id is null then raise exception 'You must be signed in to respond to a connection request.'; end if;
  if exists (select 1 from public.profiles p where p.id = v_user_id and p.is_suspended) then
    raise exception 'This account is suspended. Contact KithaLovers support if you believe this is a mistake.';
  end if;
  if p_accept is null then raise exception 'Please choose whether to accept or decline the request.'; end if;
  select * into v_request from public.connection_requests where id = p_request_id for update;
  if not found then raise exception 'Connection request not found.'; end if;
  if v_request.recipient_id <> v_user_id then raise exception 'Only the recipient can respond to this request.'; end if;
  if v_request.status <> 'pending' then raise exception 'This connection request has already been handled.'; end if;
  if not p_accept then
    update public.connection_requests set status = 'declined', updated_at = now() where id = v_request.id;
    return null;
  end if;
  select exists (select 1 from public.blocks b where
    (b.blocker_id = v_request.sender_id and b.blocked_id = v_request.recipient_id) or
    (b.blocker_id = v_request.recipient_id and b.blocked_id = v_request.sender_id)) into v_blocked;
  if v_blocked then raise exception 'This connection cannot be completed.'; end if;
  select count(*) = 2 into v_visible from public.profiles p
    where p.id in (v_request.sender_id, v_request.recipient_id) and p.is_visible = true and p.is_suspended = false;
  if not coalesce(v_visible, false) then raise exception 'Both profiles must be visible and active to create a match.'; end if;
  insert into public.matches (user_one, user_two)
    values (least(v_request.sender_id, v_request.recipient_id), greatest(v_request.sender_id, v_request.recipient_id))
    on conflict (user_one, user_two) do update set user_one = excluded.user_one returning id into v_match_id;
  update public.connection_requests set status = 'matched', updated_at = now() where id = v_request.id;
  update public.connection_requests set status = 'matched', updated_at = now()
    where sender_id = v_request.recipient_id and recipient_id = v_request.sender_id and status = 'pending';
  return v_match_id;
end;
$$;
revoke all on function public.respond_to_connection_request(uuid, boolean) from public, anon;
grant execute on function public.respond_to_connection_request(uuid, boolean) to authenticated;

create index if not exists profiles_suspension_discovery_idx on public.profiles (is_suspended, is_visible, city);
