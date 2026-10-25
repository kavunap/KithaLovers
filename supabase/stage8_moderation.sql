-- KithaLovers Stage 8: moderator-only report access.
-- IMPORTANT: grant admin role through Supabase Auth app_metadata using a trusted
-- server/Admin API. Never let clients set their own app_metadata role.
-- Expected JWT claim: app_metadata.role = 'admin'.

-- Admins may view reports and change only the status column.
drop policy if exists "Admins read all reports" on public.reports;
create policy "Admins read all reports" on public.reports
for select to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins update report status" on public.reports;
create policy "Admins update report status" on public.reports
for update to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Restrict column-level update rights: moderators can update status, not reporter,
-- reported member, reason, details, or timestamps.
revoke update on public.reports from authenticated;
grant update (status) on public.reports to authenticated;

-- Allow moderators to read names for report context, including hidden profiles.
drop policy if exists "Admins read profiles for moderation" on public.profiles;
create policy "Admins read profiles for moderation" on public.profiles
for select to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
