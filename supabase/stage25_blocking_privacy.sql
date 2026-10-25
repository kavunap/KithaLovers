-- Stage 25: strengthens EXISTING blocks table, no replacement or data loss.
-- Run after stages 3, 23 and 24. Re-runnable.

alter table public.profiles add column if not exists connection_request_policy text not null default 'everyone';
-- Stage 9 uses column-level UPDATE grants; permit editing this preference.
grant update (connection_request_policy) on public.profiles to authenticated;
alter table public.profiles drop constraint if exists profiles_connection_request_policy_check;
alter table public.profiles add constraint profiles_connection_request_policy_check check (connection_request_policy in ('everyone','none'));

-- A security-definer helper already exists in Stage 3. Replace it to ensure RLS
-- checks work in both directions without disclosing another user's block list.
create or replace function public.is_blocked_between_users(p_user_a uuid, p_user_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocks b where
    (b.blocker_id = p_user_a and b.blocked_id = p_user_b) or
    (b.blocker_id = p_user_b and b.blocked_id = p_user_a));
$$;
revoke all on function public.is_blocked_between_users(uuid,uuid) from public, anon;
grant execute on function public.is_blocked_between_users(uuid,uuid) to authenticated;

-- Never expose a blocked profile to either participant through normal reads.
drop policy if exists "Visible profiles are discoverable" on public.profiles;
create policy "Visible profiles are discoverable" on public.profiles for select to authenticated
using ((id = (select auth.uid()) or is_visible = true)
 and (id = (select auth.uid()) or not public.is_blocked_between_users(id, (select auth.uid()))));

-- Keep original block ownership policy. Existing chat Block action still inserts here.
drop policy if exists "Users manage blocks they create" on public.blocks;
create policy "Users manage blocks they create" on public.blocks for all to authenticated
using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()) and blocked_id <> blocker_id);

-- Database enforcement, including API clients that bypass the frontend.
create or replace function public.stage25_check_connection_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_blocked_between_users(new.sender_id,new.recipient_id) then
    raise exception 'A block prevents this connection request.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = new.recipient_id
    and p.is_visible = true and p.connection_request_policy = 'everyone') then
    raise exception 'This member is not accepting connection requests.';
  end if;
  return new;
end; $$;
drop trigger if exists stage25_check_connection_request on public.connection_requests;
create trigger stage25_check_connection_request before insert or update of sender_id,recipient_id
on public.connection_requests for each row execute function public.stage25_check_connection_request();

-- Protect reads of requests and matches from blocked participants.
drop policy if exists "Participants read connection requests" on public.connection_requests;
create policy "Participants read connection requests" on public.connection_requests for select to authenticated
using ((sender_id = (select auth.uid()) or recipient_id = (select auth.uid()))
 and not public.is_blocked_between_users(sender_id,recipient_id));
drop policy if exists "Users send connection requests" on public.connection_requests;
create policy "Users send connection requests" on public.connection_requests for insert to authenticated
with check (sender_id = (select auth.uid()) and sender_id <> recipient_id
 and not public.is_blocked_between_users(sender_id,recipient_id));
drop policy if exists "Members read their matches" on public.matches;
create policy "Members read their matches" on public.matches for select to authenticated
using ((user_one = (select auth.uid()) or user_two = (select auth.uid()))
 and not public.is_blocked_between_users(user_one,user_two));

-- Stage 3 messaging rules already enforce blocked conversations; keep them.
-- Prevent saving a blocked profile as a favorite even through a direct API call.
create or replace function public.stage25_check_favorite()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_blocked_between_users(new.user_id,new.profile_id) then
    raise exception 'Cannot save a blocked profile.';
  end if;
  return new;
end; $$;
drop trigger if exists stage25_check_favorite on public.profile_favorites;
create trigger stage25_check_favorite before insert or update of user_id,profile_id
on public.profile_favorites for each row execute function public.stage25_check_favorite();

-- Existing favorites are retained in storage; UI hides blocked entries.
-- Unblocking restores ordinary visibility without deleting data.
