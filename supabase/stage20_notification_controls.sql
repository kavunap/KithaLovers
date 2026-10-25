-- KithaLovers Stage 20: secure notification deletion controls.
-- Run after Stage 18's user_notifications table migration.
-- Users may delete only their own notifications; they cannot insert notifications
-- or change notification ownership/content through this permission.

revoke delete on public.user_notifications from anon, authenticated;
grant delete on public.user_notifications to authenticated;

drop policy if exists "Users delete own notifications" on public.user_notifications;
create policy "Users delete own notifications"
  on public.user_notifications
  for delete
  to authenticated
  using (user_id = auth.uid());
