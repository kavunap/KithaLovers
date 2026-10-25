-- Stage 26: member presence with explicit privacy choices (both default off).
-- Run after Stage 25. No changes to existing blocks or profile permissions.
create table if not exists public.member_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_active_at timestamptz,
  show_online boolean not null default false,
  show_last_seen boolean not null default false
);
create index if not exists member_presence_last_active_idx on public.member_presence(last_active_at desc);
alter table public.member_presence enable row level security;
revoke all on public.member_presence from anon, authenticated;
grant select (user_id, show_online, show_last_seen), update (show_online, show_last_seen) on public.member_presence to authenticated;
drop policy if exists "Members read own presence settings" on public.member_presence;
create policy "Members read own presence settings" on public.member_presence for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Members update own presence settings" on public.member_presence;
create policy "Members update own presence settings" on public.member_presence for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Server-side heartbeat: clients cannot spoof another user's activity.
create or replace function public.touch_my_presence()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.member_presence(user_id, last_active_at)
  values(auth.uid(), now())
  on conflict(user_id) do update set last_active_at = excluded.last_active_at;
end;
$$;
revoke all on function public.touch_my_presence() from public, anon;
grant execute on function public.touch_my_presence() to authenticated;

-- Server-controlled visibility, with block checks in both directions.
-- Last seen is returned only if separately enabled by the member.
create or replace function public.get_member_presence(target_member_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  requester uuid := auth.uid();
  row_data public.member_presence%rowtype;
  allowed boolean;
begin
  if requester is null or target_member_id is null then return null; end if;
  if requester <> target_member_id then
    select exists (
      select 1 from public.profiles p
      where p.id = target_member_id and p.is_visible = true and p.is_suspended = false
    ) and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = requester and b.blocked_id = target_member_id)
         or (b.blocker_id = target_member_id and b.blocked_id = requester)
    ) into allowed;
    if not allowed then return null; end if;
  end if;
  select * into row_data from public.member_presence where user_id = target_member_id;
  if not found then return jsonb_build_object('online',false,'last_seen',null); end if;
  return jsonb_build_object(
    'online', case when row_data.show_online then coalesce(row_data.last_active_at > now() - interval '2 minutes',false) else false end,
    'last_seen', case when row_data.show_last_seen then row_data.last_active_at else null end
  );
end;
$$;
revoke all on function public.get_member_presence(uuid) from public, anon;
grant execute on function public.get_member_presence(uuid) to authenticated;

-- Every existing member gets private-by-default preferences.
insert into public.member_presence(user_id)
select id from auth.users
on conflict(user_id) do nothing;

-- New accounts are covered by the heartbeat's upsert when they first sign in.
