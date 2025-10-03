-- ============================================
-- 🚀 DIAGNOSTIC RAPIDE - COPIER-COLLER DANS SUPABASE
-- ============================================
-- À exécuter après avoir créé un compte test
-- ============================================

-- ⚠️ REMPLACEZ 'test.debug@example.com' PAR VOTRE EMAIL TEST
\set test_email 'test.debug@example.com'

-- ============================================
-- 📊 RÉSUMÉ COMPLET EN UNE REQUÊTE
-- ============================================

WITH user_info AS (
  SELECT
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_user_meta_data->>'first_name' as first_name,
    raw_user_meta_data->>'last_name' as last_name,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'team_id' as metadata_team_id
  FROM auth.users
  WHERE email = :'test_email'
),
profile_info AS (
  SELECT
    u.id as profile_id,
    u.auth_user_id,
    u.name,
    u.role,
    u.team_id,
    t.name as team_name
  FROM public.users u
  LEFT JOIN public.teams t ON u.team_id = t.id
  WHERE u.auth_user_id = (SELECT id FROM user_info)
),
trigger_logs AS (
  SELECT
    step,
    status,
    message,
    created_at
  FROM public.trigger_debug_logs
  WHERE email = :'test_email'
  ORDER BY created_at ASC
)
SELECT
  '=== USER INFO ===' as section,
  (SELECT email FROM user_info) as email,
  (SELECT email_confirmed_at FROM user_info) as confirmed_at,
  (SELECT first_name FROM user_info) as first_name,
  (SELECT last_name FROM user_info) as last_name,
  (SELECT role FROM user_info) as role,
  '=== PROFILE INFO ===' as profile_section,
  (SELECT profile_id FROM profile_info) as profile_exists,
  (SELECT name FROM profile_info) as profile_name,
  (SELECT team_name FROM profile_info) as team_name,
  '=== TRIGGER STATUS ===' as trigger_section,
  (SELECT COUNT(*) FROM trigger_logs) as log_count,
  (SELECT COUNT(*) FROM trigger_logs WHERE status = 'error') as error_count,
  (SELECT message FROM trigger_logs WHERE status = 'error' LIMIT 1) as first_error;

-- ============================================
-- 📋 LOGS DÉTAILLÉS DU TRIGGER
-- ============================================

SELECT
  created_at,
  step,
  status,
  message,
  metadata
FROM public.trigger_debug_logs
WHERE email = :'test_email'
ORDER BY created_at ASC;

-- ============================================
-- 🔍 SI PAS DE LOGS, VÉRIFIER LE TRIGGER
-- ============================================

-- Vérifier que le trigger existe
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  tgenabled
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_confirmed';

-- Vérifier que la fonction existe
SELECT
  proname as function_name,
  prosecdef as security_definer
FROM pg_proc
WHERE proname = 'handle_new_user_confirmed';

-- ============================================
-- 🧪 VERSION SANS VARIABLES (si \set ne fonctionne pas)
-- ============================================
-- Décommentez et REMPLACEZ l'email ci-dessous

/*
-- 1. Info utilisateur dans auth.users
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'REMPLACER-PAR-VOTRE-EMAIL';

-- 2. Profil dans public.users (REMPLACER l'UUID par l'id ci-dessus)
SELECT
  u.id,
  u.auth_user_id,
  u.name,
  u.role,
  u.team_id,
  t.name as team_name
FROM public.users u
LEFT JOIN public.teams t ON u.team_id = t.id
WHERE u.auth_user_id = 'REMPLACER-PAR-UUID-AUTH-USER';

-- 3. Logs du trigger (REMPLACER l'email)
SELECT
  created_at,
  step,
  status,
  message,
  metadata
FROM public.trigger_debug_logs
WHERE email = 'REMPLACER-PAR-VOTRE-EMAIL'
ORDER BY created_at ASC;
*/
