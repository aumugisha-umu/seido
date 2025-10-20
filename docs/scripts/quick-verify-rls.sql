-- ============================================================================
-- VÉRIFICATION RAPIDE POST-RESET
-- ============================================================================
-- Exécuter dans Supabase SQL Editor
-- ============================================================================

-- TEST 1 : Vérifier is_team_manager() corrigée
SELECT 'TEST 1: is_team_manager() definition' AS test_name;
SELECT pg_get_functiondef('is_team_manager(uuid)'::regprocedure) AS function_code;

-- ✅ ATTENDU : Doit contenir "INNER JOIN users u ON tm.user_id = u.id"
-- ✅ ATTENDU : Doit contenir "WHERE u.auth_user_id = auth.uid()"

-- ============================================================================

-- TEST 2 : Vérifier policies buildings avec TO authenticated
SELECT 'TEST 2: Buildings policies with TO authenticated' AS test_name;
SELECT
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'buildings'
ORDER BY policyname;

-- ✅ ATTENDU : Colonne "roles" doit être {authenticated} pour toutes les policies
-- ✅ ATTENDU : 4 policies (select, insert, update, delete)

-- ============================================================================

-- TEST 3 : Compter toutes les policies Phase 2 avec authenticated
SELECT 'TEST 3: Count all Phase 2 policies' AS test_name;
SELECT
  tablename,
  COUNT(*) as policy_count,
  array_agg(DISTINCT roles) as all_roles
FROM pg_policies
WHERE tablename IN ('buildings', 'lots', 'building_contacts', 'lot_contacts', 'property_documents')
GROUP BY tablename
ORDER BY tablename;

-- ✅ ATTENDU :
--   buildings: 4 policies, roles: {{authenticated}}
--   lots: 4 policies, roles: {{authenticated}}
--   building_contacts: 4 policies, roles: {{authenticated}}
--   lot_contacts: 4 policies, roles: {{authenticated}}
--   property_documents: 4 policies, roles: {{authenticated}}
-- TOTAL: 20 policies
