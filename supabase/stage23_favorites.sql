-- KithaLovers Stage 23: private profile favorites
-- Run once in the Supabase SQL Editor. Safe to re-run.
create table if not exists public.profile_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, profile_id),
  constraint profile_favorites_no_self check (user_id <> profile_id)
);
create index if not exists profile_favorites_user_recent_idx
  on public.profile_favorites (user_id, created_at desc);
create index if not exists profile_favorites_profile_idx
  on public.profile_favorites (profile_id);

alter table public.profile_favorites enable row level security;
revoke all on public.profile_favorites from anon;
grant select, insert, delete on public.profile_favorites to authenticated;

drop policy if exists "Favorites visible to owner" on public.profile_favorites;
create policy "Favorites visible to owner" on public.profile_favorites
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Members can save available profiles" on public.profile_favorites;
create policy "Members can save available profiles" on public.profile_favorites
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and profile_id <> (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = profile_id
        and p.is_visible = true
        and p.is_suspended = false
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = user_id and b.blocked_id = profile_id)
         or (b.blocker_id = profile_id and b.blocked_id = user_id)
    )
  );

drop policy if exists "Members can remove own favorites" on public.profile_favorites;
create policy "Members can remove own favorites" on public.profile_favorites
  for delete to authenticated using (user_id = (select auth.uid()));
