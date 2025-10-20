-- =====================================================================================
-- Script de Diagnostic : Time Slot Responses
--
-- Objectif : Identifier pourquoi le bouton "Accepter" ne fonctionne pas
-- Usage : Exécuter dans Supabase SQL Editor avec l'ID de l'intervention concernée
-- =====================================================================================

-- REMPLACER CES VALEURS AVEC LES VRAIES :
-- \set intervention_id 'uuid-de-intervention'
-- \set slot_id 'uuid-du-slot'
-- \set user_id 'uuid-du-prestataire'

-- =====================================================================================
-- 1. VÉRIFIER LES ASSIGNMENTS
-- =====================================================================================
\echo '=== 1. INTERVENTION ASSIGNMENTS ==='

SELECT
  ia.id,
  ia.role,
  ia.user_id,
  u.name as user_name,
  u.email as user_email,
  u.role as user_actual_role,
  ia.assigned_at
FROM intervention_assignments ia
LEFT JOIN users u ON u.id = ia.user_id
WHERE ia.intervention_id = :intervention_id
ORDER BY ia.assigned_at;

-- =====================================================================================
-- 2. VÉRIFIER LES TIME SLOTS
-- =====================================================================================
\echo '=== 2. TIME SLOTS ==='

SELECT
  ts.id,
  ts.slot_date,
  ts.start_time,
  ts.end_time,
  ts.status,
  ts.is_selected,
  ts.proposed_by,
  u.name as proposed_by_name,
  u.role as proposed_by_role,
  ts.selected_by_manager,
  ts.selected_by_provider,
  ts.selected_by_tenant,
  ts.rejected_by_manager,
  ts.rejected_by_provider,
  ts.rejected_by_tenant,
  ts.created_at
FROM intervention_time_slots ts
LEFT JOIN users u ON u.id = ts.proposed_by
WHERE ts.intervention_id = :intervention_id
ORDER BY ts.created_at;

-- =====================================================================================
-- 3. VÉRIFIER LES RESPONSES EXISTANTES
-- =====================================================================================
\echo '=== 3. TIME SLOT RESPONSES ==='

SELECT
  tsr.id,
  tsr.time_slot_id,
  tsr.user_id,
  u.name as user_name,
  u.email as user_email,
  tsr.user_role as cached_role,
  u.role as actual_role,
  tsr.response,
  tsr.notes,
  tsr.created_at,
  tsr.updated_at
FROM time_slot_responses tsr
LEFT JOIN users u ON u.id = tsr.user_id
WHERE tsr.time_slot_id IN (
  SELECT id FROM intervention_time_slots WHERE intervention_id = :intervention_id
)
ORDER BY tsr.time_slot_id, tsr.created_at;

-- =====================================================================================
-- 4. VÉRIFIER LES TRIGGERS ACTIFS
-- =====================================================================================
\echo '=== 4. TRIGGERS ACTIFS ==='

SELECT
  t.tgname as trigger_name,
  t.tgenabled as enabled,
  c.relname as table_name,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname IN ('intervention_time_slots', 'time_slot_responses')
  AND t.tgname NOT LIKE 'RI_%'  -- Exclude FK triggers
ORDER BY c.relname, t.tgname;

-- =====================================================================================
-- 5. VÉRIFIER LES RLS POLICIES
-- =====================================================================================
\echo '=== 5. RLS POLICIES SUR time_slot_responses ==='

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
WHERE tablename = 'time_slot_responses'
ORDER BY cmd, policyname;

-- =====================================================================================
-- 6. TESTER LA PERMISSION D'INSERT POUR UN PRESTATAIRE SPÉCIFIQUE
-- =====================================================================================
\echo '=== 6. TEST DE PERMISSION INSERT (pour user_id spécifique) ==='

-- Vérifier si le prestataire peut insérer une response
SELECT
  'team_members check' as check_type,
  EXISTS(
    SELECT 1 FROM intervention_time_slots ts
    INNER JOIN interventions i ON i.id = ts.intervention_id
    INNER JOIN team_members tm ON tm.team_id = i.team_id
    WHERE ts.id = :slot_id
      AND tm.user_id = :user_id
  ) as has_permission
UNION ALL
SELECT
  'intervention_assignments check' as check_type,
  EXISTS(
    SELECT 1 FROM intervention_time_slots ts
    INNER JOIN interventions i ON i.id = ts.intervention_id
    INNER JOIN intervention_assignments ia ON ia.intervention_id = i.id
    WHERE ts.id = :slot_id
      AND ia.user_id = :user_id
      AND ia.role IN ('locataire', 'prestataire')
  ) as has_permission;

-- =====================================================================================
-- 7. VÉRIFIER LE NOMBRE DE RESPONSES ATTENDUES VS RÉELLES
-- =====================================================================================
\echo '=== 7. ANALYSE DES RESPONSES MANQUANTES ==='

WITH expected_responses AS (
  SELECT
    ts.id as slot_id,
    ia.user_id,
    ia.role,
    u.name as user_name
  FROM intervention_time_slots ts
  CROSS JOIN intervention_assignments ia
  LEFT JOIN users u ON u.id = ia.user_id
  WHERE ts.intervention_id = :intervention_id
    AND ia.intervention_id = :intervention_id
),
actual_responses AS (
  SELECT
    tsr.time_slot_id as slot_id,
    tsr.user_id,
    tsr.response
  FROM time_slot_responses tsr
  WHERE tsr.time_slot_id IN (
    SELECT id FROM intervention_time_slots WHERE intervention_id = :intervention_id
  )
)
SELECT
  er.slot_id,
  er.user_id,
  er.user_name,
  er.role,
  COALESCE(ar.response::text, 'MISSING') as response_status,
  CASE
    WHEN ar.response IS NULL THEN '⚠️ Response manquante'
    WHEN ar.response = 'pending' THEN '⏳ En attente'
    WHEN ar.response = 'accepted' THEN '✅ Acceptée'
    WHEN ar.response = 'rejected' THEN '❌ Rejetée'
  END as status_display
FROM expected_responses er
LEFT JOIN actual_responses ar ON er.slot_id = ar.slot_id AND er.user_id = ar.user_id
ORDER BY er.slot_id, er.role, er.user_name;

-- =====================================================================================
-- 8. TESTER LE TRIGGER DE CRÉATION PROACTIVE
-- =====================================================================================
\echo '=== 8. DIAGNOSTIC DU TRIGGER create_responses_for_new_timeslot ==='

SELECT
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname = 'create_responses_for_new_timeslot';

-- =====================================================================================
-- 9. COMPTER LES VALIDATIONS PAR SLOT
-- =====================================================================================
\echo '=== 9. RÉSUMÉ DES VALIDATIONS PAR SLOT ==='

SELECT
  ts.id as slot_id,
  ts.slot_date,
  ts.start_time,
  ts.status,
  COUNT(CASE WHEN tsr.response = 'accepted' AND tsr.user_role IN ('gestionnaire', 'admin') THEN 1 END) as managers_accepted,
  COUNT(CASE WHEN tsr.response = 'accepted' AND tsr.user_role = 'prestataire' THEN 1 END) as providers_accepted,
  COUNT(CASE WHEN tsr.response = 'accepted' AND tsr.user_role = 'locataire' THEN 1 END) as tenants_accepted,
  COUNT(CASE WHEN tsr.response = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN tsr.response = 'rejected' THEN 1 END) as rejected_count,
  ts.selected_by_manager,
  ts.selected_by_provider,
  ts.selected_by_tenant,
  -- Validation finale
  (ts.selected_by_provider AND ts.selected_by_tenant) as can_be_finalized
FROM intervention_time_slots ts
LEFT JOIN time_slot_responses tsr ON tsr.time_slot_id = ts.id
WHERE ts.intervention_id = :intervention_id
GROUP BY ts.id, ts.slot_date, ts.start_time, ts.status,
         ts.selected_by_manager, ts.selected_by_provider, ts.selected_by_tenant
ORDER BY ts.slot_date, ts.start_time;

-- =====================================================================================
-- INSTRUCTIONS D'USAGE
-- =====================================================================================
/*

1. Ouvrir Supabase SQL Editor
2. Remplacer les variables au début du script :
   - :intervention_id → UUID de l'intervention concernée
   - :slot_id → UUID du time slot concerné
   - :user_id → UUID du prestataire qui ne peut pas accepter

3. Exécuter le script complet

4. Analyser les résultats :
   - Section 1 : Vérifier que le prestataire est bien assigné
   - Section 3 : Vérifier si sa response existe (et son statut)
   - Section 6 : Vérifier s'il a les permissions nécessaires
   - Section 7 : Identifier les responses manquantes
   - Section 9 : Vérifier les colonnes selected_by_*

5. Scénarios possibles :

   A. Response manquante (Section 7) :
      → Le prestataire a été assigné APRÈS la création du slot
      → Le trigger n'a pas créé sa response
      → Solution : Backfill ou améliorer acceptTimeSlotAction

   B. Permission refusée (Section 6) :
      → has_permission = false
      → RLS policy bloque l'insert/update
      → Solution : Corriger les RLS policies ou vérifier l'assignment

   C. Trigger désactivé (Section 4) :
      → tgenabled = 'D' (disabled)
      → Solution : Réactiver le trigger

   D. Response existe mais colonnes selected_by_* incorrectes (Section 9) :
      → providers_accepted > 0 mais selected_by_provider = false
      → Le trigger de mise à jour ne fonctionne pas
      → Solution : Corriger le trigger update_time_slot_validation_summary

*/
