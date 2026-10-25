-- Stage 40: aggregate-only administrator analytics.
-- SECURITY DEFINER is restricted to authenticated administrators by a server-verified role claim.
-- Search path is fixed and all relations are schema-qualified.
CREATE OR REPLACE FUNCTION public.admin_dashboard_overview()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE result jsonb;
BEGIN
  IF auth.uid() IS NULL OR (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'members',(SELECT count(*) FROM public.profiles),
    'suspended',(SELECT count(*) FROM public.profiles WHERE is_suspended = true),
    'matches',(SELECT count(*) FROM public.matches),
    'messages',(SELECT count(*) FROM public.messages),
    'pending_reports',(SELECT count(*) FROM public.reports WHERE status IN ('open','reviewing')),
    'pending_verifications',(SELECT count(*) FROM public.profile_verification_requests WHERE status = 'pending'),
    'pending_deletions',(SELECT count(*) FROM public.account_deletion_requests WHERE status = 'pending'),
    'active_7d',(SELECT count(*) FROM public.member_presence WHERE last_active_at >= now() - interval '7 days'),
    'registrations',(SELECT coalesce(jsonb_agg(jsonb_build_object('day',to_char(d.day,'YYYY-MM-DD'),'total', (SELECT count(*) FROM public.profiles p WHERE p.created_at >= d.day AND p.created_at < d.day + interval '1 day')) ORDER BY d.day),'[]'::jsonb) FROM generate_series((current_date - 13)::timestamp,current_date::timestamp,interval '1 day') AS d(day)),
    'messages_daily',(SELECT coalesce(jsonb_agg(jsonb_build_object('day',to_char(d.day,'YYYY-MM-DD'),'total', (SELECT count(*) FROM public.messages m WHERE m.created_at >= d.day AND m.created_at < d.day + interval '1 day')) ORDER BY d.day),'[]'::jsonb) FROM generate_series((current_date - 13)::timestamp,current_date::timestamp,interval '1 day') AS d(day))
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_dashboard_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_overview() TO authenticated;
