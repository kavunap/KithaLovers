-- KithaLovers Stage 6: unread-message tracking and realtime notifications.
-- Run once in Supabase SQL Editor after Stage 5.

-- Allow a conversation participant to mark only incoming messages as read.
-- Column-level grants prevent clients from changing message text, sender, or match.
drop policy if exists "Recipients mark incoming messages read" on public.messages;
create policy "Recipients mark incoming messages read" on public.messages
for update to authenticated
using (
  sender_id <> auth.uid()
  and exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and (m.user_one = auth.uid() or m.user_two = auth.uid())
  )
  and not exists (
    select 1 from public.blocks b
    join public.matches m on m.id = messages.match_id
    where (b.blocker_id = m.user_one and b.blocked_id = m.user_two)
       or (b.blocker_id = m.user_two and b.blocked_id = m.user_one)
  )
)
with check (
  sender_id <> auth.uid()
  and exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and (m.user_one = auth.uid() or m.user_two = auth.uid())
  )
);

grant update (read_at) on public.messages to authenticated;

-- Realtime subscriptions are used for header badges. Add the tables only if
-- the project's supabase_realtime publication exists and does not include them.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'connection_requests'
    ) then
      alter publication supabase_realtime add table public.connection_requests;
    end if;
  end if;
end $$;
