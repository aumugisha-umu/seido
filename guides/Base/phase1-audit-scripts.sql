-- =============================================================================
-- PHASE 1: SCRIPTS D'AUDIT DES DONNÉES EXISTANTES
-- =============================================================================
-- Date: 13 septembre 2025
-- Objectif: Analyser l'état actuel avant migration users/contacts
-- Usage: Exécuter chaque section et documenter les résultats

-- =============================================================================
-- 1. AUDIT DES UTILISATEURS ET CONTACTS
-- =============================================================================

-- 1.1 Compter les enregistrements dans chaque table
SELECT 'users' as table_name, COUNT(*) as total_records FROM users
UNION ALL
SELECT 'contacts' as table_name, COUNT(*) as total_records FROM contacts
UNION ALL  
SELECT 'auth.users' as table_name, COUNT(*) as total_records FROM auth.users;

-- 1.2 Analyser la répartition par rôle/type
SELECT 'users_by_role' as category, role::text as type, COUNT(*) as count
FROM users GROUP BY role
UNION ALL
SELECT 'contacts_by_type' as category, contact_type::text as type, COUNT(*) as count  
FROM contacts GROUP BY contact_type
ORDER BY category, type;

-- 1.3 IDENTIFIER LES DUPLICATAS EMAIL (CRITIQUE)
SELECT 
    'DUPLICATAS_EMAIL' as issue_type,
    u.email,
    'users' as source,
    u.id as user_id,
    u.name as user_name,
    u.role::text as user_role
FROM users u
WHERE u.email IN (
    SELECT c.email FROM contacts c WHERE c.email IS NOT NULL
)
UNION ALL
SELECT 
    'DUPLICATAS_EMAIL' as issue_type,
    c.email,
    'contacts' as source,
    c.id as contact_id,
    c.name as contact_name,
    c.contact_type::text as contact_role
FROM contacts c  
WHERE c.email IN (
    SELECT u.email FROM users u WHERE u.email IS NOT NULL
)
ORDER BY email, source;

-- 1.4 Analyser les emails uniques vs partagés
WITH email_analysis AS (
    SELECT email, 'users' as source FROM users WHERE email IS NOT NULL
    UNION ALL
    SELECT email, 'contacts' as source FROM contacts WHERE email IS NOT NULL
)
SELECT 
    email,
    COUNT(*) as appears_in_tables,
    STRING_AGG(source, ', ') as found_in_tables
FROM email_analysis 
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY appears_in_tables DESC, email;

-- =============================================================================
-- 2. AUDIT DES RELATIONS DIRECTES (MANAGER_ID, TENANT_ID)
-- =============================================================================

-- 2.1 Analyser buildings.manager_id
SELECT 
    'buildings_with_manager' as metric,
    COUNT(*) as total_buildings,
    COUNT(manager_id) as buildings_with_manager,
    COUNT(CASE WHEN manager_id IS NULL THEN 1 END) as buildings_without_manager,
    ROUND(COUNT(manager_id) * 100.0 / COUNT(*), 2) as percentage_with_manager
FROM buildings;

-- 2.2 Analyser lots.tenant_id  
SELECT 
    'lots_with_tenant' as metric,
    COUNT(*) as total_lots,
    COUNT(tenant_id) as lots_with_tenant,
    COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as lots_without_tenant,
    COUNT(CASE WHEN is_occupied = true THEN 1 END) as lots_marked_occupied,
    ROUND(COUNT(tenant_id) * 100.0 / COUNT(*), 2) as percentage_with_tenant
FROM lots;

-- 2.3 Vérifier cohérence lots: tenant_id vs is_occupied
SELECT 
    'coherence_tenant_occupied' as check_type,
    COUNT(*) as total_lots,
    COUNT(CASE WHEN tenant_id IS NOT NULL AND is_occupied = true THEN 1 END) as coherent_occupied,
    COUNT(CASE WHEN tenant_id IS NULL AND is_occupied = false THEN 1 END) as coherent_vacant,
    COUNT(CASE WHEN tenant_id IS NOT NULL AND is_occupied = false THEN 1 END) as has_tenant_marked_vacant,
    COUNT(CASE WHEN tenant_id IS NULL AND is_occupied = true THEN 1 END) as no_tenant_marked_occupied
FROM lots;

-- 2.4 Analyser interventions.assigned_contact_id
SELECT 
    'interventions_assignment' as metric,
    COUNT(*) as total_interventions,
    COUNT(assigned_contact_id) as interventions_with_assigned_contact,
    COUNT(CASE WHEN assigned_contact_id IS NULL THEN 1 END) as interventions_without_contact,
    ROUND(COUNT(assigned_contact_id) * 100.0 / COUNT(*), 2) as percentage_with_assigned_contact
FROM interventions;

-- =============================================================================
-- 3. AUDIT DES TABLES DE LIAISON EXISTANTES
-- =============================================================================

-- 3.1 État de building_contacts
SELECT 
    'building_contacts' as table_name,
    COUNT(*) as total_relations,
    COUNT(DISTINCT building_id) as unique_buildings,
    COUNT(DISTINCT contact_id) as unique_contacts,
    STRING_AGG(DISTINCT contact_type::text, ', ') as contact_types_used
FROM building_contacts;

-- 3.2 État de lot_contacts  
SELECT 
    'lot_contacts' as table_name,
    COUNT(*) as total_relations,
    COUNT(DISTINCT lot_id) as unique_lots,
    COUNT(DISTINCT contact_id) as unique_contacts,
    STRING_AGG(DISTINCT contact_type::text, ', ') as contact_types_used
FROM lot_contacts;

-- 3.3 État deintervention_assignments
SELECT 
    'intervention_contacts' as table_name,
    COUNT(*) as total_relations,
    COUNT(DISTINCT intervention_id) as unique_interventions,
    COUNT(DISTINCT contact_id) as unique_contacts,
    STRING_AGG(DISTINCT role, ', ') as roles_used
FROMintervention_assignments;

-- 3.4 Analyser lot_contacts vs lots.tenant_id (cohérence)
WITH lot_tenant_comparison AS (
    SELECT 
        l.id as lot_id,
        l.tenant_id as direct_tenant_id,
        lc.contact_id as lot_contact_tenant_id,
        CASE 
            WHEN l.tenant_id = lc.contact_id THEN 'COHERENT'
            WHEN l.tenant_id IS NULL AND lc.contact_id IS NOT NULL THEN 'MISSING_DIRECT_TENANT'
            WHEN l.tenant_id IS NOT NULL AND lc.contact_id IS NULL THEN 'MISSING_LOT_CONTACT'
            WHEN l.tenant_id != lc.contact_id THEN 'MISMATCH'
            ELSE 'BOTH_NULL'
        END as coherence_status
    FROM lots l
    LEFT JOIN lot_contacts lc ON l.id = lc.lot_id 
        AND lc.contact_type = 'locataire' 
        AND lc.is_primary = true
        AND (lc.end_date IS NULL OR lc.end_date > CURRENT_DATE)
)
SELECT 
    coherence_status,
    COUNT(*) as lots_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM lots), 2) as percentage
FROM lot_tenant_comparison
GROUP BY coherence_status
ORDER BY lots_count DESC;

-- =============================================================================
-- 4. ANALYSE DES ÉQUIPES
-- =============================================================================

-- 4.1 État du système d'équipes
SELECT 
    'teams_overview' as metric,
    (SELECT COUNT(*) FROM teams) as total_teams,
    (SELECT COUNT(*) FROM team_members) as total_memberships,
    (SELECT COUNT(DISTINCT user_id) FROM team_members) as users_in_teams,
    (SELECT COUNT(*) FROM users) as total_users,
    ROUND((SELECT COUNT(DISTINCT user_id) FROM team_members) * 100.0 / (SELECT COUNT(*) FROM users), 2) as percentage_users_in_teams;

-- 4.2 Répartition team_id dans les tables principales
SELECT 'buildings_with_team' as table_type, COUNT(*) as total, COUNT(team_id) as with_team_id FROM buildings
UNION ALL
SELECT 'lots_with_team' as table_type, COUNT(*) as total, COUNT(team_id) as with_team_id FROM lots  
UNION ALL
SELECT 'contacts_with_team' as table_type, COUNT(*) as total, COUNT(team_id) as with_team_id FROM contacts
UNION ALL
SELECT 'interventions_with_team' as table_type, COUNT(*) as total, COUNT(team_id) as with_team_id FROM interventions;

-- =============================================================================
-- 5. CONFLITS POTENTIELS À RÉSOUDRE
-- =============================================================================

-- 5.1 Contacts qui existent dans users mais avec des informations différentes
SELECT 
    'POTENTIAL_CONFLICTS' as issue,
    u.email,
    u.name as user_name,
    c.name as contact_name,
    u.role as user_role,
    c.contact_type as contact_type,
    CASE 
        WHEN u.name != c.name THEN 'NAME_MISMATCH'
        WHEN u.role::text != c.contact_type::text THEN 'ROLE_TYPE_MISMATCH'
        ELSE 'NAMES_MATCH'
    END as conflict_type
FROM users u
INNER JOIN contacts c ON u.email = c.email
WHERE u.name != c.name 
   OR u.role::text != c.contact_type::text;

-- 5.2 Contacts sans équivalent dans users (à migrer)
SELECT 
    'CONTACTS_TO_MIGRATE' as category,
    c.*
FROM contacts c
LEFT JOIN users u ON c.email = u.email
WHERE u.email IS NULL
ORDER BY c.contact_type, c.name;

-- 5.3 Users sans équivalent dans contacts (OK - pas de conflit)
SELECT 
    'USERS_WITHOUT_CONTACT_EQUIVALENT' as category,
    COUNT(*) as count
FROM users u
LEFT JOIN contacts c ON u.email = c.email
WHERE c.email IS NULL;

-- =============================================================================
-- 6. RÉSUMÉ EXÉCUTIF
-- =============================================================================

-- 6.1 Résumé des métriques clés
WITH summary_stats AS (
    SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM contacts) as total_contacts,
        (SELECT COUNT(*) FROM auth.users) as total_auth_users,
        (SELECT COUNT(DISTINCT u.email) FROM users u INNER JOIN contacts c ON u.email = c.email) as duplicated_emails,
        (SELECT COUNT(*) FROM buildings WHERE manager_id IS NOT NULL) as buildings_with_manager,
        (SELECT COUNT(*) FROM lots WHERE tenant_id IS NOT NULL) as lots_with_tenant,
        (SELECT COUNT(*) FROM interventions WHERE assigned_contact_id IS NOT NULL) as interventions_with_assigned_contact
)
SELECT 
    '=== RÉSUMÉ AUDIT PHASE 1 ===' as section,
    CURRENT_TIMESTAMP as audit_date,
    total_users,
    total_contacts, 
    total_auth_users,
    duplicated_emails,
    CONCAT(ROUND(duplicated_emails * 100.0 / GREATEST(total_users, total_contacts), 2), '%') as duplication_rate,
    buildings_with_manager,
    lots_with_tenant,
    interventions_with_assigned_contact
FROM summary_stats;

-- =============================================================================
-- 7. RECOMMANDATIONS BASÉES SUR L'AUDIT
-- =============================================================================

DO $$
DECLARE
    users_count INTEGER;
    contacts_count INTEGER;  
    duplicates_count INTEGER;
    buildings_with_manager INTEGER;
    lots_with_tenant INTEGER;
BEGIN
    SELECT COUNT(*) INTO users_count FROM users;
    SELECT COUNT(*) INTO contacts_count FROM contacts;
    SELECT COUNT(DISTINCT u.email) INTO duplicates_count 
        FROM users u INNER JOIN contacts c ON u.email = c.email;
    SELECT COUNT(*) INTO buildings_with_manager FROM buildings WHERE manager_id IS NOT NULL;
    SELECT COUNT(*) INTO lots_with_tenant FROM lots WHERE tenant_id IS NOT NULL;
    
    RAISE NOTICE '=== AUDIT PHASE 1 - RECOMMANDATIONS ===';
    RAISE NOTICE 'Total users: %, Total contacts: %', users_count, contacts_count;
    RAISE NOTICE 'Emails dupliqués: % (%.1%%)', duplicates_count, 
        (duplicates_count * 100.0 / GREATEST(users_count, contacts_count));
    RAISE NOTICE 'Bâtiments avec manager_id: %', buildings_with_manager;  
    RAISE NOTICE 'Lots avec tenant_id: %', lots_with_tenant;
    
    IF duplicates_count > 0 THEN
        RAISE NOTICE '⚠️  ATTENTION: % emails dupliqués nécessitent une stratégie de fusion', duplicates_count;
    END IF;
    
    IF buildings_with_manager > 0 OR lots_with_tenant > 0 THEN
        RAISE NOTICE '✅ Relations directes détectées - migration vers tables de liaison requise';
    END IF;
    
    RAISE NOTICE '=== FIN AUDIT PHASE 1 ===';
END $$;
