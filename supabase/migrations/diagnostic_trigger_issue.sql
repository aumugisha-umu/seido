-- ============================================
-- 🔍 DIAGNOSTIC COMPLET: Pourquoi le trigger ne crée pas le profil?
-- ============================================
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================

-- ============================================
-- 1️⃣ VÉRIFIER QUE LE TRIGGER EXISTE
-- ============================================
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing,
  action_orientation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_confirmed';

-- ✅ Résultat attendu: 1 ligne avec trigger_name = 'on_auth_user_confirmed'
-- ❌ Si vide: Le trigger n'existe pas → besoin de le déployer

-- ============================================
-- 2️⃣ VÉRIFIER QUE LA FONCTION EXISTE
-- ============================================
SELECT
  proname as function_name,
  prosecdef as is_security_definer,
  provolatile as volatility
FROM pg_proc
WHERE proname = 'handle_new_user_confirmed';

-- ✅ Résultat attendu: 1 ligne avec function_name = 'handle_new_user_confirmed'
-- ❌ Si vide: La fonction n'existe pas → besoin de la déployer

-- ============================================
-- 3️⃣ VÉRIFIER L'ÉTAT DE L'UTILISATEUR DANS auth.users
-- ============================================
-- ⚠️ REMPLACEZ 'votre.email@example.com' PAR L'EMAIL DU TEST
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'team_id' as team_id
FROM auth.users
WHERE email = 'votre.email@example.com';

-- ✅ Si email_confirmed_at IS NOT NULL → confirmation OK
-- ❌ Si email_confirmed_at IS NULL → confirmation n'a pas eu lieu
-- ✅ Si first_name, last_name, role existent → metadata OK
-- ❌ Si NULL → metadata manquantes (trigger ne peut pas créer profil)

-- ============================================
-- 4️⃣ VÉRIFIER SI LE PROFIL EXISTE DANS public.users
-- ============================================
-- ⚠️ REMPLACEZ l'UUID par l'id de auth.users ci-dessus
SELECT
  id,
  auth_user_id,
  email,
  name,
  role,
  team_id,
  created_at
FROM public.users
WHERE auth_user_id = 'UUID-DE-AUTH-USER';

-- ✅ Si 1 ligne → profil créé avec succès
-- ❌ Si vide → trigger a échoué ou n'a pas été exécuté

-- ============================================
-- 5️⃣ VÉRIFIER SI L'ÉQUIPE EXISTE DANS public.teams
-- ============================================
-- ⚠️ REMPLACEZ l'UUID par le team_id de public.users ci-dessus
SELECT
  id,
  name,
  created_at
FROM public.teams
WHERE id = 'UUID-DE-TEAM';

-- ✅ Si 1 ligne → équipe créée avec succès
-- ❌ Si vide → équipe non créée (vérifier team_id dans metadata)

-- ============================================
-- 6️⃣ VÉRIFIER LES CONTRAINTES SUR public.users
-- ============================================
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'users'
  AND tc.table_schema = 'public';

-- 🔍 Identifier les contraintes NOT NULL et FOREIGN KEY qui pourraient bloquer
-- Colonnes critiques à vérifier: team_id, auth_user_id, email, name, role

-- ============================================
-- 7️⃣ VÉRIFIER LES POLITIQUES RLS SUR public.users
-- ============================================
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
WHERE tablename = 'users'
  AND schemaname = 'public';

-- 🔍 Vérifier qu'il n'y a pas de politique RLS qui bloque les INSERT
-- Le trigger s'exécute avec SECURITY DEFINER donc devrait bypass RLS

-- ============================================
-- 8️⃣ VÉRIFIER SI RLS EST ACTIVÉ SUR public.users
-- ============================================
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'users'
  AND schemaname = 'public';

-- ✅ Si rowsecurity = true → RLS activé (normal)
-- 🔍 Vérifier que le trigger utilise SECURITY DEFINER pour bypass RLS

-- ============================================
-- 9️⃣ TEST MANUEL: SIMULER LA CRÉATION D'UN PROFIL
-- ============================================
-- ⚠️ NE PAS EXÉCUTER SI VOUS AVEZ UN VRAI UTILISATEUR
-- Ceci teste si la logique de création fonctionne manuellement
/*
DO $$
DECLARE
  test_auth_user_id uuid := 'UUID-DE-AUTH-USER'; -- REMPLACER
  test_email text := 'test@example.com';
  test_first_name text := 'Test';
  test_last_name text := 'User';
  test_role text := 'gestionnaire';
  v_team_id uuid;
BEGIN
  -- Créer une équipe de test
  INSERT INTO public.teams (name)
  VALUES (test_first_name || ' ' || test_last_name || '''s Team')
  RETURNING id INTO v_team_id;

  -- Créer un profil de test
  INSERT INTO public.users (
    auth_user_id,
    email,
    name,
    role,
    team_id,
    avatar_url,
    phone
  ) VALUES (
    test_auth_user_id,
    test_email,
    test_first_name || ' ' || test_last_name,
    test_role,
    v_team_id,
    NULL,
    NULL
  );

  RAISE NOTICE 'Test réussi: team_id = %, profil créé', v_team_id;
END $$;
*/

-- ============================================
-- 🔟 VÉRIFIER LES LOGS POSTGRESQL (si accès)
-- ============================================
-- ⚠️ Peut ne pas fonctionner selon les permissions Supabase
/*
SELECT
  log_time,
  message
FROM pg_stat_statements
WHERE query LIKE '%handle_new_user_confirmed%'
ORDER BY log_time DESC
LIMIT 10;
*/

-- ============================================
-- 📊 RÉSUMÉ DU DIAGNOSTIC
-- ============================================
-- Exécutez chaque requête ci-dessus dans l'ordre
-- Notez les résultats pour chaque étape
-- Les résultats permettront d'identifier:
-- - Si le trigger/fonction existe (étapes 1-2)
-- - Si la confirmation a eu lieu (étape 3)
-- - Si le profil a été créé (étape 4)
-- - Si l'équipe a été créée (étape 5)
-- - Les contraintes qui pourraient bloquer (étape 6)
-- - Les politiques RLS qui pourraient bloquer (étapes 7-8)
-- - Si la logique de création fonctionne manuellement (étape 9)
