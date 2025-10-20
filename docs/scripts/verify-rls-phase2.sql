-- ============================================================================
-- SCRIPT DE VÉRIFICATION : RLS Phase 2
-- ============================================================================
-- Date: 2025-10-12
-- Usage: Copier-coller dans Supabase SQL Editor APRÈS le reset
-- Durée: ~2 minutes
-- ============================================================================

-- ============================================================================
-- TEST 1 : Vérifier le code des fonctions RLS
-- ============================================================================

-- 1.1 Vérifier is_admin()
SELECT
  'is_admin()' AS function_name,
  pg_get_functiondef('is_admin'::regproc) AS definition;

-- ✅ ATTENDU : Doit contenir "WHERE auth_user_id = auth.uid()"
-- ❌ ERREUR : Si tu vois "WHERE id = auth.uid()"

-- 1.2 Vérifier is_gestionnaire()
SELECT
  'is_gestionnaire()' AS function_name,
  pg_get_functiondef('is_gestionnaire'::regproc) AS definition;

-- ✅ ATTENDU : Doit contenir "WHERE auth_user_id = auth.uid()"

-- 1.3 Vérifier is_team_manager()
SELECT
  'is_team_manager(UUID)' AS function_name,
  pg_get_functiondef('is_team_manager(uuid)'::regprocedure) AS definition;

-- ✅ ATTENDU : Doit contenir "INNER JOIN users u ON tm.user_id = u.id"
-- ✅ ATTENDU : Doit contenir "WHERE u.auth_user_id = auth.uid()"

-- 1.4 Vérifier can_view_building()
SELECT
  'can_view_building(UUID)' AS function_name,
  pg_get_functiondef('can_view_building(uuid)'::regprocedure) AS definition;

-- ============================================================================
-- TEST 2 : Vérifier les policies RLS avec TO authenticated
-- ============================================================================

-- 2.1 Lister toutes les policies buildings
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'buildings'
ORDER BY policyname;

-- ✅ ATTENDU : Colonne "roles" doit contenir {authenticated} pour chaque policy
-- ✅ ATTENDU : 4 policies (select, insert, update, delete)

-- 2.2 Lister toutes les policies lots
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'lots'
ORDER BY policyname;

-- ✅ ATTENDU : 4 policies avec {authenticated}

-- 2.3 Lister toutes les policies property_documents
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'property_documents'
ORDER BY policyname;

-- ✅ ATTENDU : 4 policies avec {authenticated}

-- ============================================================================
-- TEST 3 : Vérifier auth context personnel
-- ============================================================================

-- 3.1 Vérifier auth.uid() et résolution user
SELECT
  auth.uid() AS current_auth_uid,
  (SELECT id FROM users WHERE auth_user_id = auth.uid()) AS database_user_id,
  (SELECT role FROM users WHERE auth_user_id = auth.uid()) AS user_role,
  (SELECT email FROM users WHERE auth_user_id = auth.uid()) AS user_email;

-- ✅ ATTENDU :
--   current_auth_uid: Ton UUID Supabase Auth
--   database_user_id: UUID de users.id
--   user_role: 'gestionnaire' ou 'admin'
--   user_email: Ton email

-- 3.2 Tester permissions (⚠️ REMPLACE <TEAM_ID> par ton team_id réel)
SELECT
  is_admin() AS am_i_admin,
  is_gestionnaire() AS am_i_gestionnaire,
  is_team_manager('<TEAM_ID>') AS am_i_team_manager;

-- ✅ ATTENDU :
--   am_i_admin: TRUE ou FALSE selon ton rôle
--   am_i_gestionnaire: TRUE si tu es gestionnaire
--   am_i_team_manager: TRUE si tu es membre actif de cette équipe

-- ============================================================================
-- TEST 4 : Debug complet building insert (⚠️ REMPLACE <TEAM_ID>)
-- ============================================================================

SELECT * FROM debug_check_building_insert('<TEAM_ID>');

-- ✅ ATTENDU :
--   current_auth_uid: Ton UUID
--   user_exists: TRUE
--   user_role: 'gestionnaire'
--   is_in_team: TRUE
--   is_active_member: TRUE
--   is_manager_result: TRUE  ← CRITIQUE : DOIT ÊTRE TRUE

-- ❌ SI is_manager_result = FALSE :
--   Vérifier team_members avec la requête ci-dessous

-- ============================================================================
-- TEST 5 : Vérifier team_members (si debug échoue)
-- ============================================================================

-- ⚠️ REMPLACE <AUTH_USER_ID> par ton current_auth_uid du TEST 3.1
SELECT
  tm.id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.left_at,
  u.email,
  u.auth_user_id,
  t.name AS team_name
FROM team_members tm
INNER JOIN users u ON tm.user_id = u.id
INNER JOIN teams t ON tm.team_id = t.id
WHERE u.auth_user_id = '<AUTH_USER_ID>'
ORDER BY tm.joined_at DESC;

-- ✅ ATTENDU : Au moins 1 ligne avec :
--   left_at: NULL (membre actif)
--   role: 'gestionnaire' ou 'admin'

-- ============================================================================
-- RÉSUMÉ DES VÉRIFICATIONS
-- ============================================================================

-- [ ] TEST 1 : Fonctions RLS contiennent "auth_user_id = auth.uid()"
-- [ ] TEST 2 : Policies ont roles = {authenticated}
-- [ ] TEST 3 : auth.uid() résolu correctement
-- [ ] TEST 4 : is_manager_result = TRUE
-- [ ] TEST 5 : team_members actif trouvé

-- Si TOUS les tests passent → Prêt à tester création building dans l'app
-- Si UN test échoue → Partager l'erreur exacte pour diagnostic
