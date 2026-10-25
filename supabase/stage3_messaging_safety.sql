-- KithaLovers Stage 3: private messaging and member safety.
-- Run once in Supabase Dashboard -> SQL Editor AFTER schema.sql and stage2_discovery_matching.sql.

-- Security-definer helper lets RLS detect a block in either direction without
-- exposing the other member's private block list.
create or replace function public.is_blocked_between_users(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.blocks b
    where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
       or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
  );
$$;
revoke all on function public.is_blocked_between_users(uuid, uuid) from public;
grant execute on function public.is_blocked_between_users(uuid, uuid) to authenticated;

-- Ensure a user can only see and send messages while both match participants
-- remain unblocked. Existing conversation history becomes inaccessible after a block.
drop policy if exists "Match members read messages" on public.messages;
create policy "Unblocked match members read messages" on public.messages
for select to authenticated
using (
  exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and (m.user_one = (select auth.uid()) or m.user_two = (select auth.uid()))
      and not public.is_blocked_between_users(m.user_one, m.user_two)
  )
);

drop policy if exists "Match members send own messages" on public.messages;
create policy "Unblocked match members send own messages" on public.messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and char_length(trim(body)) between 1 and 4000
  and exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and (m.user_one = (select auth.uid()) or m.user_two = (select auth.uid()))
      and not public.is_blocked_between_users(m.user_one, m.user_two)
  )
);

-- A member may create only their own block and cannot block themselves (table constraint).
-- Existing block policy is retained; this policy is recreated idempotently for clarity.
drop policy if exists "Users manage blocks they create" on public.blocks;
create policy "Users manage blocks they create" on public.blocks
for all to authenticated
using (blocker_id = (select auth.uid()))
with check (blocker_id = (select auth.uid()));

-- Reports are private to the reporter and insert-only for regular members.
drop policy if exists "Users submit reports" on public.reports;
create policy "Users submit reports" on public.reports
for insert to authenticated
with check (reporter_id = (select auth.uid()) and reporter_id <> reported_id);

drop policy if exists "Users read reports they submitted" on public.reports;
create policy "Users read reports they submitted" on public.reports
for select to authenticated
using (reporter_id = (select auth.uid()));

-- No member-facing update/delete access to messages or moderation reports.
revoke update, delete on public.messages from anon, authenticated;
revoke update, delete on public.reports from anon, authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert on public.reports to authenticated;
grant select, insert, delete on public.blocks to authenticated;
