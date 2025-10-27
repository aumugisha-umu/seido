-- ============================================================================
-- SCRIPT DE DEBUG - Tenant RLS Issue
-- ============================================================================
-- Execute this script to understand why tenant cannot create assignment
--
-- Replace these UUIDs with the actual values from the error:
-- interventionId: 084ea785-1c7e-42d5-af85-b18eb6c4755b
-- userId: af5c480d-cb56-4ab4-a283-869ad46c083a
-- ============================================================================

-- Variables (replace with actual values from error)
\set intervention_id '084ea785-1c7e-42d5-af85-b18eb6c4755b'
\set user_id 'af5c480d-cb56-4ab4-a283-869ad46c083a'

-- ============================================================================
-- SECTION 1: Verify User Info
-- ============================================================================
SELECT
  '=== USER INFO ===' as section,
  u.id,
  u.auth_user_id,
  u.name,
  u.email,
  u.role
FROM users u
WHERE u.id = :'user_id';

-- ============================================================================
-- SECTION 2: Verify Intervention Info
-- ============================================================================
SELECT
  '=== INTERVENTION INFO ===' as section,
  i.id,
  i.reference,
  i.lot_id,
  i.building_id,
  i.team_id,
  i.status,
  i.created_at
FROM interventions i
WHERE i.id = :'intervention_id';

-- ============================================================================
-- SECTION 3: Check if lot exists and its details
-- ============================================================================
SELECT
  '=== LOT INFO ===' as section,
  l.id,
  l.reference,
  l.apartment_number,
  l.team_id,
  l.building_id
FROM interventions i
INNER JOIN lots l ON l.id = i.lot_id
WHERE i.id = :'intervention_id';

-- ============================================================================
-- SECTION 4: Check if user is in lot_contacts for this lot
-- ============================================================================
SELECT
  '=== LOT_CONTACTS CHECK ===' as section,
  lc.id as lot_contact_id,
  lc.lot_id,
  lc.user_id,
  lc.is_primary,
  u.name as user_name,
  u.role as user_role
FROM interventions i
INNER JOIN lot_contacts lc ON lc.lot_id = i.lot_id
INNER JOIN users u ON u.id = lc.user_id
WHERE i.id = :'intervention_id'
  AND lc.user_id = :'user_id';

-- ============================================================================
-- SECTION 5: Show ALL lot_contacts for this intervention's lot
-- ============================================================================
SELECT
  '=== ALL LOT_CONTACTS FOR THIS LOT ===' as section,
  lc.id,
  lc.lot_id,
  lc.user_id,
  lc.is_primary,
  u.name,
  u.email,
  u.role
FROM interventions i
INNER JOIN lot_contacts lc ON lc.lot_id = i.lot_id
INNER JOIN users u ON u.id = lc.user_id
WHERE i.id = :'intervention_id';

-- ============================================================================
-- SECTION 6: Check team membership (manager check)
-- ============================================================================
SELECT
  '=== TEAM MEMBERSHIP CHECK ===' as section,
  tm.id as team_member_id,
  tm.team_id,
  tm.user_id,
  tm.role as member_role,
  tm.left_at,
  u.name,
  u.role as user_role
FROM interventions i
INNER JOIN team_members tm ON tm.team_id = i.team_id
INNER JOIN users u ON u.id = tm.user_id
WHERE i.id = :'intervention_id'
  AND tm.user_id = :'user_id';

-- ============================================================================
-- SECTION 7: Simulate the RLS policy check
-- ============================================================================
-- This simulates what the RLS policy should check

-- Check 1: User exists and matches
SELECT
  '=== RLS CHECK 1: User Match ===' as section,
  u.id,
  u.auth_user_id,
  u.name,
  CASE
    WHEN u.id = :'user_id' THEN 'PASS'
    ELSE 'FAIL'
  END as result
FROM users u
WHERE u.id = :'user_id';

-- Check 2: Manager check
SELECT
  '=== RLS CHECK 2: Manager Check ===' as section,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM interventions i
      INNER JOIN team_members tm ON tm.team_id = i.team_id
      WHERE i.id = :'intervention_id'
        AND tm.user_id = :'user_id'
        AND tm.role IN ('gestionnaire', 'admin')
        AND tm.left_at IS NULL
    ) THEN 'PASS - User is manager'
    ELSE 'FAIL - User is NOT manager'
  END as result;

-- Check 3: Tenant via lot_contacts check
SELECT
  '=== RLS CHECK 3: Tenant Check ===' as section,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM interventions i
      INNER JOIN lot_contacts lc ON lc.lot_id = i.lot_id
      WHERE i.id = :'intervention_id'
        AND i.lot_id IS NOT NULL
        AND lc.user_id = :'user_id'
    ) THEN 'PASS - User is tenant of lot'
    ELSE 'FAIL - User is NOT tenant of lot'
  END as result;

-- ============================================================================
-- SECTION 8: Final RLS verdict
-- ============================================================================
SELECT
  '=== FINAL RLS VERDICT ===' as section,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = :'user_id'
        AND (
          -- Manager check
          EXISTS (
            SELECT 1 FROM interventions i
            INNER JOIN team_members tm ON tm.team_id = i.team_id
            WHERE i.id = :'intervention_id'
              AND tm.user_id = u.id
              AND tm.role IN ('gestionnaire', 'admin')
              AND tm.left_at IS NULL
          )
          OR
          -- Tenant check
          EXISTS (
            SELECT 1 FROM interventions i
            INNER JOIN lot_contacts lc ON lc.lot_id = i.lot_id
            WHERE i.id = :'intervention_id'
              AND i.lot_id IS NOT NULL
              AND lc.user_id = u.id
          )
        )
    ) THEN 'PASS - INSERT should be ALLOWED'
    ELSE 'FAIL - INSERT will be BLOCKED by RLS'
  END as verdict;

-- ============================================================================
-- SECTION 9: Check current RLS policy
-- ============================================================================
SELECT
  '=== CURRENT RLS POLICY ===' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'intervention_assignments'
  AND policyname = 'assignments_insert';
