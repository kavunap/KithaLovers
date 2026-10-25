-- KithaLovers Stage 7: enforce adult age eligibility at the database boundary.
-- Run after schema.sql and the Stage 2–6 migrations.
-- This does not store verification documents or claim that a member's identity is verified.

create or replace function public.enforce_adult_profile_age()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birth_date is not null and new.birth_date > (current_date - interval '18 years')::date then
    raise exception 'KithaLovers is for adults aged 18 and over.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_require_adult_age on public.profiles;
create trigger profiles_require_adult_age
before insert or update of birth_date on public.profiles
for each row execute function public.enforce_adult_profile_age();

-- Prevent profiles with no birth date from being listed in discovery.
-- The application also requires a valid date of birth before saving a profile.
update public.profiles
set is_visible = false, updated_at = now()
where birth_date is null or birth_date > (current_date - interval '18 years')::date;
