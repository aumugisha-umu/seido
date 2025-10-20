-- ============================================================================
-- VERIFICATION SCHEMA interventions - Debug tenant_id removal
-- ============================================================================

-- 1. Verify tenant_id column is gone
SELECT
  'tenant_id column status' as check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'interventions' AND column_name = 'tenant_id'
    ) THEN '❌ STILL EXISTS'
    ELSE '✅ REMOVED'
  END as status;

-- 2. List all columns in interventions table
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'interventions'
ORDER BY ordinal_position;

-- 3. Check RLS policies on interventions
SELECT
  policyname,
  cmd,
  permissive,
  roles,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'interventions'
ORDER BY policyname;

-- 4. Check RLS policies on intervention_assignments
SELECT
  policyname,
  cmd,
  permissive,
  roles,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'intervention_assignments'
ORDER BY policyname;

-- 5. Check if is_tenant_of_intervention helper exists and its definition
SELECT
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'is_tenant_of_intervention';

-- 6. Check if create_intervention_conversations trigger exists
SELECT
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'create_intervention_conversations';

-- 7. List recent migrations applied
SELECT
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
ORDER BY executed_at DESC
LIMIT 10;
