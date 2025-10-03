-- Check current RLS policies and their conditions
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('users', 'team_members')
ORDER BY tablename, cmd, policyname;

-- Check if RLS is enabled on the tables
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('users', 'team_members');

-- Check if service role can bypass RLS
SELECT
    rolname,
    rolbypassrls
FROM pg_roles
WHERE rolname IN ('postgres', 'service_role', 'authenticated', 'anon');