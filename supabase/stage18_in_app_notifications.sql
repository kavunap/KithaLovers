-- KithaLovers Stage 18: persistent in-app notification center.
-- Run after the Stage 16 notification preferences migration and Stage 17 email log migration.

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('connection_request','match','message')),
  title text not null,
  body text not null,
  target_path text not null default '/connections',
  entity_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint user_notifications_path_safe check (left(target_path, 1) = '/')
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);
create index if not exists user_notifications_unread_idx
  on public.user_notifications (user_id, created_at desc) where read_at is null;

alter table public.user_notifications enable row level security;
revoke all on public.user_notifications from anon, authenticated;
grant select on public.user_notifications to authenticated;
grant update (read_at) on public.user_notifications to authenticated;

drop policy if exists "Users read own notifications" on public.user_notifications;
create policy "Users read own notifications" on public.user_notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users mark own notifications read" on public.user_notifications;
create policy "Users mark own notifications read" on public.user_notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.create_connection_request_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare enabled boolean;
begin
  if new.status <> 'pending' then return new; end if;
  select coalesce(p.in_app_connection_requests, true) into enabled
  from public.notification_preferences p where p.user_id = new.recipient_id;
  if coalesce(enabled, true) then
    insert into public.user_notifications(user_id, actor_id, type, title, body, target_path, entity_id)
    values (new.recipient_id, new.sender_id, 'connection_request', 'New connection request',
      'Someone would like to connect with you.', '/connections', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists connection_request_notification_after_insert on public.connection_requests;
create trigger connection_request_notification_after_insert
after insert on public.connection_requests
for each row execute function public.create_connection_request_notification();

create or replace function public.create_match_notifications()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare enabled_one boolean; enabled_two boolean;
begin
  select coalesce(p.in_app_matches, true) into enabled_one
    from public.notification_preferences p where p.user_id = new.user_one;
  select coalesce(p.in_app_matches, true) into enabled_two
    from public.notification_preferences p where p.user_id = new.user_two;
  if coalesce(enabled_one, true) then
    insert into public.user_notifications(user_id, actor_id, type, title, body, target_path, entity_id)
    values (new.user_one, new.user_two, 'match', 'It’s a match!',
      'You and another member can now connect.', '/messages/' || new.id::text, new.id);
  end if;
  if coalesce(enabled_two, true) then
    insert into public.user_notifications(user_id, actor_id, type, title, body, target_path, entity_id)
    values (new.user_two, new.user_one, 'match', 'It’s a match!',
      'You and another member can now connect.', '/messages/' || new.id::text, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists match_notification_after_insert on public.matches;
create trigger match_notification_after_insert
after insert on public.matches
for each row execute function public.create_match_notifications();

create or replace function public.create_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare recipient uuid; enabled boolean; blocked boolean;
begin
  select case when m.user_one = new.sender_id then m.user_two else m.user_one end
    into recipient from public.matches m
    where m.id = new.match_id and (m.user_one = new.sender_id or m.user_two = new.sender_id);
  if recipient is null then return new; end if;
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = new.sender_id and b.blocked_id = recipient)
       or (b.blocker_id = recipient and b.blocked_id = new.sender_id)
  ) into blocked;
  if blocked then return new; end if;
  select coalesce(p.in_app_messages, true) into enabled
    from public.notification_preferences p where p.user_id = recipient;
  if coalesce(enabled, true) then
    insert into public.user_notifications(user_id, actor_id, type, title, body, target_path, entity_id)
    values (recipient, new.sender_id, 'message', 'New message',
      'You have a new message waiting in KithaLovers.', '/messages/' || new.match_id::text, new.match_id);
  end if;
  return new;
end;
$$;

drop trigger if exists message_notification_after_insert on public.messages;
create trigger message_notification_after_insert
after insert on public.messages
for each row execute function public.create_message_notification();

-- Add the table to Supabase Realtime when the publication is available.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_notifications') then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
end $$;
