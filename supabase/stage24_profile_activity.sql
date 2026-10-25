-- Stage 24: profile activity and visitor privacy.
-- Run after Stage 23. View events are created only through the guarded RPC.
create table if not exists public.profile_visit_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  anonymous_browsing boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.profile_visits (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  visitor_id uuid not null references public.profiles(id) on delete cascade,
  visited_at timestamptz not null default now(),
  constraint profile_visits_not_self check (profile_id <> visitor_id)
);
create index if not exists profile_visits_owner_recent on public.profile_visits(profile_id,visited_at desc);
create index if not exists profile_visits_visitor on public.profile_visits(visitor_id);
alter table public.profile_visit_preferences enable row level security;
alter table public.profile_visits enable row level security;
revoke all on public.profile_visit_preferences from anon;
revoke all on public.profile_visits from anon, authenticated;
grant select, insert, update on public.profile_visit_preferences to authenticated;
drop policy if exists "Read own visit privacy" on public.profile_visit_preferences;
create policy "Read own visit privacy" on public.profile_visit_preferences for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Create own visit privacy" on public.profile_visit_preferences;
create policy "Create own visit privacy" on public.profile_visit_preferences for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Update own visit privacy" on public.profile_visit_preferences;
create policy "Update own visit privacy" on public.profile_visit_preferences for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Security-definer functions enforce ownership and avoid exposing the raw visits table.
create or replace function public.record_profile_visit(target_profile_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare viewer uuid := auth.uid();
begin
  if viewer is null or target_profile_id is null or viewer = target_profile_id then return false; end if;
  if exists (select 1 from public.profile_visit_preferences where user_id = viewer and anonymous_browsing) then return false; end if;
  if not exists (select 1 from public.profiles p where p.id = target_profile_id and p.is_visible = true and p.is_suspended = false) then return false; end if;
  if exists (select 1 from public.blocks b where (b.blocker_id = viewer and b.blocked_id = target_profile_id) or (b.blocker_id = target_profile_id and b.blocked_id = viewer)) then return false; end if;
  -- At most one visit per viewer/profile per 30 minutes.
  if exists (select 1 from public.profile_visits where visitor_id = viewer and profile_id = target_profile_id and visited_at > now() - interval '30 minutes') then return false; end if;
  insert into public.profile_visits(profile_id, visitor_id) values(target_profile_id, viewer);
  return true;
end $$;
revoke all on function public.record_profile_visit(uuid) from public;
grant execute on function public.record_profile_visit(uuid) to authenticated;

create or replace function public.my_profile_activity()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when auth.uid() is null then '{}'::jsonb else jsonb_build_object(
    'total_views', (select count(*) from public.profile_visits v where v.profile_id = auth.uid()),
    'unique_visitors', (select count(distinct visitor_id) from public.profile_visits v where v.profile_id = auth.uid()),
    'favorites_received', (select count(*) from public.profile_favorites f where f.profile_id = auth.uid()),
    'recent_visitors', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.visitor_id, 'visited_at', q.last_visit, 'display_name', q.display_name, 'photo_url', q.photo_url) order by q.last_visit desc)
      from (
        select v.visitor_id, max(v.visited_at) last_visit, p.display_name, p.photo_url
        from public.profile_visits v join public.profiles p on p.id = v.visitor_id
        where v.profile_id = auth.uid() and p.is_visible = true and p.is_suspended = false
          and not exists (select 1 from public.profile_visit_preferences pref where pref.user_id = v.visitor_id and pref.anonymous_browsing)
          and not exists (select 1 from public.blocks b where (b.blocker_id = auth.uid() and b.blocked_id = v.visitor_id) or (b.blocker_id = v.visitor_id and b.blocked_id = auth.uid()))
        group by v.visitor_id, p.display_name, p.photo_url order by last_visit desc limit 30
      ) q
    ), '[]'::jsonb)
  ) end
$$;
revoke all on function public.my_profile_activity() from public;
grant execute on function public.my_profile_activity() to authenticated;
