-- Migration: Add individual conversation threads per participant
--
-- This migration adds support for individual conversation threads:
-- - Each tenant gets their own private thread with managers
-- - Each provider gets their own private thread with managers
-- - New group threads: tenants_group and providers_group
--
-- Thread structure after migration:
-- - group: All participants (unchanged)
-- - tenants_group: All tenants + managers (NEW)
-- - providers_group: All providers + managers (NEW, for grouped mode)
-- - tenant_to_managers: One per tenant (participant_id = tenant's user_id)
-- - provider_to_managers: One per provider (participant_id = provider's user_id)

-- ============================================================================
-- 1. ADD NEW THREAD TYPES TO ENUM
-- ============================================================================

-- Add tenants_group type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'tenants_group'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'conversation_thread_type')
  ) THEN
    ALTER TYPE conversation_thread_type ADD VALUE 'tenants_group';
  END IF;
END $$;

-- Add providers_group type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'providers_group'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'conversation_thread_type')
  ) THEN
    ALTER TYPE conversation_thread_type ADD VALUE 'providers_group';
  END IF;
END $$;

-- ============================================================================
-- 2. ADD PARTICIPANT_ID COLUMN FOR INDIVIDUAL THREADS
-- ============================================================================

-- Add participant_id column (nullable - NULL for group threads)
ALTER TABLE conversation_threads
ADD COLUMN IF NOT EXISTS participant_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Comment for documentation
COMMENT ON COLUMN conversation_threads.participant_id IS
'For individual threads (tenant_to_managers, provider_to_managers): the specific tenant/provider user_id. NULL for group threads (group, tenants_group, providers_group).';

-- ============================================================================
-- 3. UPDATE UNIQUE CONSTRAINT
-- ============================================================================

-- Drop the old constraint that only allowed one thread per type
ALTER TABLE conversation_threads
DROP CONSTRAINT IF EXISTS unique_intervention_thread_type;

-- Create new constraint that allows multiple threads of same type with different participant_id
-- Using a partial unique index approach for better NULL handling
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_thread_type_no_participant
ON conversation_threads (intervention_id, thread_type)
WHERE participant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_thread_type_with_participant
ON conversation_threads (intervention_id, thread_type, participant_id)
WHERE participant_id IS NOT NULL;

-- ============================================================================
-- 4. ADD PERFORMANCE INDEXES
-- ============================================================================

-- Index for finding threads by participant
CREATE INDEX IF NOT EXISTS idx_threads_participant_id
ON conversation_threads(participant_id)
WHERE participant_id IS NOT NULL;

-- Index for finding individual threads for a user
CREATE INDEX IF NOT EXISTS idx_threads_intervention_participant
ON conversation_threads(intervention_id, participant_id)
WHERE participant_id IS NOT NULL;

-- ============================================================================
-- 5. UPDATE RLS POLICY FOR THREAD ACCESS
-- ============================================================================

-- Drop existing function if it exists (we'll recreate it)
DROP FUNCTION IF EXISTS can_view_conversation_thread(UUID, UUID);

-- Create updated function for thread access control
CREATE OR REPLACE FUNCTION can_view_conversation_thread(
  p_thread_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_thread RECORD;
  v_user_role TEXT;
  v_is_team_member BOOLEAN;
  v_is_participant BOOLEAN;
BEGIN
  -- Get thread info
  SELECT t.*, u.role as user_role
  INTO v_thread
  FROM conversation_threads t
  CROSS JOIN (SELECT role FROM users WHERE id = p_user_id) u
  WHERE t.id = p_thread_id;

  IF v_thread IS NULL THEN
    RETURN FALSE;
  END IF;

  v_user_role := v_thread.user_role;

  -- Check if user is a team member (gestionnaire/admin)
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = v_thread.team_id AND user_id = p_user_id
  ) INTO v_is_team_member;

  -- Managers can see all threads in their team
  IF v_is_team_member AND v_user_role IN ('gestionnaire', 'admin') THEN
    RETURN TRUE;
  END IF;

  -- Check if user is a direct participant
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE thread_id = p_thread_id AND user_id = p_user_id
  ) INTO v_is_participant;

  -- Handle individual threads (tenant_to_managers, provider_to_managers)
  IF v_thread.participant_id IS NOT NULL THEN
    -- For individual threads, user must be the specific participant OR a manager
    IF v_thread.thread_type = 'tenant_to_managers' THEN
      RETURN v_thread.participant_id = p_user_id OR v_is_team_member;
    ELSIF v_thread.thread_type = 'provider_to_managers' THEN
      RETURN v_thread.participant_id = p_user_id OR v_is_team_member;
    END IF;
  END IF;

  -- Handle group threads
  CASE v_thread.thread_type
    WHEN 'group' THEN
      -- Anyone who is a participant can view
      RETURN v_is_participant OR v_is_team_member;
    WHEN 'tenants_group' THEN
      -- Only tenants and managers
      RETURN (v_is_participant AND v_user_role = 'locataire') OR v_is_team_member;
    WHEN 'providers_group' THEN
      -- Only providers and managers
      RETURN (v_is_participant AND v_user_role = 'prestataire') OR v_is_team_member;
    ELSE
      RETURN v_is_participant OR v_is_team_member;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. LOG MIGRATION COMPLETION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Individual conversation threads support added';
  RAISE NOTICE 'New thread types: tenants_group, providers_group';
  RAISE NOTICE 'New column: participant_id for individual threads';
END $$;
