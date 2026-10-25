-- Stage 45: READ-ONLY security review. Safe to run in Supabase SQL Editor.
-- Inspect before changing policies. This script does not grant, revoke, or modify data.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
ORDER BY c.relrowsecurity ASC, c.relname;

SELECT schemaname, tablename, policyname, permissive, roles, cmd,
       qual AS using_expression, with_check AS check_expression
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT routine_schema, routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

SELECT table_schema, table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon','authenticated','public')
ORDER BY table_name, grantee, privilege_type;
