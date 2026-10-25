-- KithaLovers Stage 17: idempotency and delivery tracking for email alerts.
-- Run after the Stage 16 migration in Supabase SQL Editor.

create table if not exists public.email_notification_log (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('connection_request', 'match', 'message', 'product_update')),
  event_id text not null,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_type, event_id, recipient_id)
);

alter table public.email_notification_log enable row level security;
revoke all on public.email_notification_log from anon, authenticated;
-- No client-facing policies are intentionally created. Only the Edge Function's
-- service-role client may read/write delivery records.

-- Ensure accounts created before Stage 16 also have preference rows.
insert into public.notification_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;
