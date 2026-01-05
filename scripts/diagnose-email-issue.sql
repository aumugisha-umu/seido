-- ============================================================================
-- Script de diagnostic : Problème d'envoi d'email au locataire
-- ============================================================================
-- 
-- Ce script permet de diagnostiquer pourquoi un locataire n'a pas reçu
-- l'email lors de la création d'une intervention.
--
-- UTILISATION:
-- 1. Remplacez <INTERVENTION_ID> par l'ID de l'intervention concernée
-- 2. Remplacez <LOCATAIRE_USER_ID> par l'ID du locataire concerné (si connu)
-- 3. Exécutez chaque requête dans l'ordre
--
-- ============================================================================

-- 1. Vérifier les assignments de l'intervention
--    → Doit montrer le locataire avec role='locataire'
SELECT 
  ia.id as assignment_id,
  ia.intervention_id,
  ia.user_id,
  ia.role,
  ia.is_primary,
  ia.assigned_by,
  ia.assigned_at,
  u.email,
  u.name,
  u.role as user_role,
  u.first_name,
  u.last_name
FROM intervention_assignments ia
JOIN users u ON u.id = ia.user_id
WHERE ia.intervention_id = '<INTERVENTION_ID>'
ORDER BY ia.role, ia.is_primary DESC;

-- 2. Vérifier spécifiquement les locataires assignés
SELECT 
  ia.*,
  u.email,
  u.name,
  u.role,
  u.first_name,
  u.last_name,
  CASE 
    WHEN u.email IS NULL THEN '❌ PAS D''EMAIL'
    WHEN u.email = '' THEN '❌ EMAIL VIDE'
    ELSE '✅ EMAIL VALIDE'
  END as email_status
FROM intervention_assignments ia
JOIN users u ON u.id = ia.user_id
WHERE ia.intervention_id = '<INTERVENTION_ID>'
  AND ia.role = 'locataire';

-- 3. Vérifier les détails du locataire spécifique
SELECT 
  id,
  email,
  name,
  first_name,
  last_name,
  role,
  CASE 
    WHEN email IS NULL THEN '❌ PAS D''EMAIL'
    WHEN email = '' THEN '❌ EMAIL VIDE'
    WHEN email NOT LIKE '%@%' THEN '❌ EMAIL INVALIDE'
    ELSE '✅ EMAIL VALIDE'
  END as email_status
FROM users
WHERE id = '<LOCATAIRE_USER_ID>';

-- 4. Vérifier l'intervention et son créateur
SELECT 
  i.id,
  i.reference,
  i.title,
  i.created_by,
  creator.email as creator_email,
  creator.name as creator_name,
  creator.role as creator_role
FROM interventions i
LEFT JOIN users creator ON creator.id = i.created_by
WHERE i.id = '<INTERVENTION_ID>';

-- 5. Vérifier tous les utilisateurs qui devraient recevoir l'email
--    (basé sur la logique de determineInterventionRecipients)
WITH intervention_data AS (
  SELECT 
    i.id,
    i.created_by,
    i.team_id,
    -- IDs des utilisateurs assignés directement
    ARRAY_AGG(DISTINCT CASE WHEN ia.role = 'gestionnaire' THEN ia.user_id END) FILTER (WHERE ia.role = 'gestionnaire') as assigned_managers,
    ARRAY_AGG(DISTINCT CASE WHEN ia.role = 'prestataire' THEN ia.user_id END) FILTER (WHERE ia.role = 'prestataire') as assigned_providers,
    ARRAY_AGG(DISTINCT CASE WHEN ia.role = 'locataire' THEN ia.user_id END) FILTER (WHERE ia.role = 'locataire') as assigned_tenants
  FROM interventions i
  LEFT JOIN intervention_assignments ia ON ia.intervention_id = i.id
  WHERE i.id = '<INTERVENTION_ID>'
  GROUP BY i.id, i.created_by, i.team_id
),
team_managers AS (
  SELECT DISTINCT tm.user_id
  FROM intervention_data id
  JOIN team_members tm ON tm.team_id = id.team_id
  JOIN users u ON u.id = tm.user_id
  WHERE u.role = 'gestionnaire'
    AND tm.user_id != id.created_by
)
SELECT 
  'Assigné directement (gestionnaire)' as recipient_type,
  u.id,
  u.email,
  u.name,
  u.role,
  CASE WHEN u.email IS NULL OR u.email = '' THEN '❌ PAS D''EMAIL' ELSE '✅' END as email_status
FROM intervention_data id
CROSS JOIN LATERAL UNNEST(id.assigned_managers) as manager_id
JOIN users u ON u.id = manager_id
WHERE manager_id IS NOT NULL
  AND manager_id != id.created_by

UNION ALL

SELECT 
  'Assigné directement (prestataire)' as recipient_type,
  u.id,
  u.email,
  u.name,
  u.role,
  CASE WHEN u.email IS NULL OR u.email = '' THEN '❌ PAS D''EMAIL' ELSE '✅' END as email_status
FROM intervention_data id
CROSS JOIN LATERAL UNNEST(id.assigned_providers) as provider_id
JOIN users u ON u.id = provider_id
WHERE provider_id IS NOT NULL
  AND provider_id != id.created_by

UNION ALL

SELECT 
  'Assigné directement (locataire)' as recipient_type,
  u.id,
  u.email,
  u.name,
  u.role,
  CASE WHEN u.email IS NULL OR u.email = '' THEN '❌ PAS D''EMAIL' ELSE '✅' END as email_status
FROM intervention_data id
CROSS JOIN LATERAL UNNEST(id.assigned_tenants) as tenant_id
JOIN users u ON u.id = tenant_id
WHERE tenant_id IS NOT NULL
  AND tenant_id != id.created_by

UNION ALL

SELECT 
  'Gestionnaire d''équipe (non assigné)' as recipient_type,
  u.id,
  u.email,
  u.name,
  u.role,
  CASE WHEN u.email IS NULL OR u.email = '' THEN '❌ PAS D''EMAIL' ELSE '✅' END as email_status
FROM intervention_data id
JOIN team_managers tm ON true
JOIN users u ON u.id = tm.user_id
WHERE u.id NOT IN (
  SELECT UNNEST(COALESCE(id.assigned_managers, ARRAY[]::uuid[]))
  UNION
  SELECT UNNEST(COALESCE(id.assigned_providers, ARRAY[]::uuid[]))
  UNION
  SELECT UNNEST(COALESCE(id.assigned_tenants, ARRAY[]::uuid[]))
)
ORDER BY recipient_type, u.name;

-- 6. Résumé : Comptage des recipients par statut
WITH intervention_data AS (
  SELECT 
    i.id,
    i.created_by,
    ARRAY_AGG(DISTINCT CASE WHEN ia.role = 'locataire' THEN ia.user_id END) FILTER (WHERE ia.role = 'locataire') as assigned_tenants
  FROM interventions i
  LEFT JOIN intervention_assignments ia ON ia.intervention_id = i.id AND ia.role = 'locataire'
  WHERE i.id = '<INTERVENTION_ID>'
  GROUP BY i.id, i.created_by
)
SELECT 
  COUNT(*) as total_tenants_assigned,
  COUNT(u.email) FILTER (WHERE u.email IS NOT NULL AND u.email != '') as tenants_with_email,
  COUNT(*) FILTER (WHERE u.email IS NULL OR u.email = '') as tenants_without_email,
  STRING_AGG(u.id::text, ', ') FILTER (WHERE u.email IS NULL OR u.email = '') as tenant_ids_without_email
FROM intervention_data id
CROSS JOIN LATERAL UNNEST(id.assigned_tenants) as tenant_id
JOIN users u ON u.id = tenant_id
WHERE tenant_id IS NOT NULL
  AND tenant_id != id.created_by;


