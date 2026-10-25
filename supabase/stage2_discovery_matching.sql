-- KithaLovers Stage 2: real discovery and secure mutual matching.
-- Run this AFTER supabase/schema.sql. It is safe to run more than once.

-- Allow signed-in users to read interests only for profiles they are allowed to discover.
 drop policy if exists "Read interests of visible profiles" on public.profile_interests;
create policy "Read interests of visible profiles" on public.profile_interests
for select to authenticated
using (
  profile_id = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.id = profile_interests.profile_id and p.is_visible = true
  )
);

-- Do not let browser clients manufacture or alter match records.
revoke insert, update, delete on table public.matches from anon, authenticated;
grant select on table public.matches to authenticated;

create or replace function public.respond_to_connection_request(
  p_request_id uuid,
  p_accept boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.connection_requests%rowtype;
  v_match_id uuid;
  v_blocked boolean;
  v_visible boolean;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to respond to a connection request.';
  end if;
  if p_accept is null then
    raise exception 'Please choose whether to accept or decline the request.';
  end if;

  select * into v_request
  from public.connection_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Connection request not found.';
  end if;
  if v_request.recipient_id <> v_user_id then
    raise exception 'Only the recipient can respond to this request.';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'This connection request has already been handled.';
  end if;

  if not p_accept then
    update public.connection_requests
      set status = 'declined', updated_at = now()
      where id = v_request.id;
    return null;
  end if;

  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = v_request.sender_id and b.blocked_id = v_request.recipient_id)
       or (b.blocker_id = v_request.recipient_id and b.blocked_id = v_request.sender_id)
  ) into v_blocked;
  if v_blocked then
    raise exception 'This connection cannot be completed.';
  end if;

  select count(*) = 2 into v_visible
  from public.profiles p
  where p.id in (v_request.sender_id, v_request.recipient_id)
    and p.is_visible = true;
  if not coalesce(v_visible, false) then
    raise exception 'Both profiles must be visible to create a match.';
  end if;

  insert into public.matches (user_one, user_two)
  values (least(v_request.sender_id, v_request.recipient_id), greatest(v_request.sender_id, v_request.recipient_id))
  on conflict (user_one, user_two) do update set user_one = excluded.user_one
  returning id into v_match_id;

  update public.connection_requests
    set status = 'matched', updated_at = now()
    where id = v_request.id;

  -- If both people sent requests, mark the reverse request as matched too.
  update public.connection_requests
    set status = 'matched', updated_at = now()
    where sender_id = v_request.recipient_id
      and recipient_id = v_request.sender_id
      and status = 'pending';

  return v_match_id;
end;
$$;

revoke all on function public.respond_to_connection_request(uuid, boolean) from public;
revoke all on function public.respond_to_connection_request(uuid, boolean) from anon;
grant execute on function public.respond_to_connection_request(uuid, boolean) to authenticated;
