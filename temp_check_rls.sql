SELECT policyname, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'team_members'
  AND cmd = 'SELECT';
