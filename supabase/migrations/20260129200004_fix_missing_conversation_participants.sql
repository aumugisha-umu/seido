-- Migration: 20260128160000_fix_missing_conversation_participants.sql
-- Description: Fix missing participants in conversation threads
-- Problem: Some threads were created without adding all team managers as participants
-- Solution: Add missing managers to all intervention conversation threads

-- ============================================================================
-- Add missing managers to GROUP threads
-- ============================================================================
-- For each group thread, add all team managers who are not already participants
INSERT INTO conversation_participants (thread_id, user_id, joined_at)
SELECT DISTINCT
    ct.id AS thread_id,
    u.id AS user_id,
    NOW() AS joined_at
FROM conversation_threads ct
-- Join to get the intervention's team_id
JOIN interventions i ON i.id = ct.intervention_id
-- Get all managers of that team
JOIN users u ON u.team_id = i.team_id
    AND u.role IN ('gestionnaire', 'admin')
    AND u.deleted_at IS NULL
    AND u.auth_user_id IS NOT NULL -- Only active users with auth
-- Only for group threads
WHERE ct.thread_type = 'group'
-- Exclude users who are already participants
AND NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.thread_id = ct.id
    AND cp.user_id = u.id
)
ON CONFLICT (thread_id, user_id) DO NOTHING;

-- ============================================================================
-- Add missing managers to TENANT_TO_MANAGERS threads
-- ============================================================================
INSERT INTO conversation_participants (thread_id, user_id, joined_at)
SELECT DISTINCT
    ct.id AS thread_id,
    u.id AS user_id,
    NOW() AS joined_at
FROM conversation_threads ct
JOIN interventions i ON i.id = ct.intervention_id
JOIN users u ON u.team_id = i.team_id
    AND u.role IN ('gestionnaire', 'admin')
    AND u.deleted_at IS NULL
    AND u.auth_user_id IS NOT NULL
WHERE ct.thread_type = 'tenant_to_managers'
AND NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.thread_id = ct.id
    AND cp.user_id = u.id
)
ON CONFLICT (thread_id, user_id) DO NOTHING;

-- ============================================================================
-- Add missing managers to PROVIDER_TO_MANAGERS threads
-- ============================================================================
INSERT INTO conversation_participants (thread_id, user_id, joined_at)
SELECT DISTINCT
    ct.id AS thread_id,
    u.id AS user_id,
    NOW() AS joined_at
FROM conversation_threads ct
JOIN interventions i ON i.id = ct.intervention_id
JOIN users u ON u.team_id = i.team_id
    AND u.role IN ('gestionnaire', 'admin')
    AND u.deleted_at IS NULL
    AND u.auth_user_id IS NOT NULL
WHERE ct.thread_type = 'provider_to_managers'
AND NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.thread_id = ct.id
    AND cp.user_id = u.id
)
ON CONFLICT (thread_id, user_id) DO NOTHING;

-- ============================================================================
-- Add missing assigned tenants to TENANT_TO_MANAGERS threads
-- ============================================================================
INSERT INTO conversation_participants (thread_id, user_id, joined_at)
SELECT DISTINCT
    ct.id AS thread_id,
    ia.user_id AS user_id,
    NOW() AS joined_at
FROM conversation_threads ct
JOIN intervention_assignments ia ON ia.intervention_id = ct.intervention_id
    AND ia.role = 'locataire'
JOIN users u ON u.id = ia.user_id
    AND u.deleted_at IS NULL
WHERE ct.thread_type = 'tenant_to_managers'
AND NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.thread_id = ct.id
    AND cp.user_id = ia.user_id
)
ON CONFLICT (thread_id, user_id) DO NOTHING;

-- ============================================================================
-- Add missing assigned providers to PROVIDER_TO_MANAGERS threads
-- ============================================================================
INSERT INTO conversation_participants (thread_id, user_id, joined_at)
SELECT DISTINCT
    ct.id AS thread_id,
    ia.user_id AS user_id,
    NOW() AS joined_at
FROM conversation_threads ct
JOIN intervention_assignments ia ON ia.intervention_id = ct.intervention_id
    AND ia.role = 'prestataire'
JOIN users u ON u.id = ia.user_id
    AND u.deleted_at IS NULL
WHERE ct.thread_type = 'provider_to_managers'
AND NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.thread_id = ct.id
    AND cp.user_id = ia.user_id
)
ON CONFLICT (thread_id, user_id) DO NOTHING;

-- Add comment documenting the fix
COMMENT ON TABLE conversation_participants IS
'Participants in conversation threads.
Fixed 2026-01-28: Added missing managers to all thread types via migration.
All team managers should be participants in all intervention threads.';
