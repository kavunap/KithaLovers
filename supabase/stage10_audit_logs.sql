-- KithaLovers Stage 10: audit trail for administrator moderation actions.
-- Run once after Stage 9. The table is append-only for client roles; only trusted
-- admin JWTs may read it. Triggers write rows for report status and suspension changes.

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid null,
  action text not null check (action in ('report_status_changed', 'account_suspended', 'account_reactivated')),
  target_type text not null check (target_type in ('report', 'profile')),
  target_id uuid null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_action_created_at_idx on public.admin_audit_logs (action, created_at desc);
create index if not exists admin_audit_logs_actor_idx on public.admin_audit_logs (actor_id, created_at desc);
create index if not exists admin_audit_logs_target_idx on public.admin_audit_logs (target_id, created_at desc);

alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from anon, authenticated;
grant select on public.admin_audit_logs to authenticated;

drop policy if exists "Admins read audit logs" on public.admin_audit_logs;
create policy "Admins read audit logs" on public.admin_audit_logs
for select to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- No client insert/update/delete policies are provided. SECURITY DEFINER trigger
-- functions own the writes and pin search_path to prevent object shadowing.
create or replace function public.audit_report_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
    values (
      auth.uid(),
      'report_status_changed',
      'report',
      new.id,
      jsonb_build_object('old_status', old.status, 'new_status', new.status, 'reason', new.reason)
    );
  end if;
  return new;
end;
$$;

revoke all on function public.audit_report_status_change() from public, anon, authenticated;
drop trigger if exists audit_report_status_change on public.reports;
create trigger audit_report_status_change
after update of status on public.reports
for each row execute function public.audit_report_status_change();

create or replace function public.audit_profile_suspension_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_suspended is distinct from old.is_suspended then
    insert into public.admin_audit_logs (actor_id, action, target_type, target_id, details)
    values (
      auth.uid(),
      case when new.is_suspended then 'account_suspended' else 'account_reactivated' end,
      'profile',
      new.id,
      jsonb_build_object(
        'display_name', new.display_name,
        'reason', case when new.is_suspended then new.suspension_reason else old.suspension_reason end
      )
    );
  end if;
  return new;
end;
$$;

revoke all on function public.audit_profile_suspension_change() from public, anon, authenticated;
drop trigger if exists audit_profile_suspension_change on public.profiles;
create trigger audit_profile_suspension_change
after update of is_suspended on public.profiles
for each row execute function public.audit_profile_suspension_change();

comment on table public.admin_audit_logs is 'Append-only audit history of KithaLovers moderation and account status changes.';
