-- ============================================================================
-- MIGRATION: Multi-Provider Assignments (Mode Groupe / Separe)
-- ============================================================================
-- Date: 2025-12-08
-- Description: Support multiple providers per intervention with two modes:
--   - group: All info shared between providers
--   - separate: Each provider sees only their own time slots, instructions, quotes
-- ============================================================================

-- ============================================================================
-- SECTION 1: NEW ENUM - assignment_mode
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_mode') THEN
    CREATE TYPE assignment_mode AS ENUM (
      'single',    -- 1 seul prestataire (comportement actuel par defaut)
      'group',     -- N prestataires, infos partagees
      'separate'   -- N prestataires, infos isolees (creneaux, instructions, devis)
    );
  END IF;
END $$;

COMMENT ON TYPE assignment_mode IS 'Mode d''assignation: single (1 prestataire), group (N avec infos partagees), separate (N avec infos isolees)';

-- ============================================================================
-- SECTION 2: ALTER TABLE interventions - Add assignment_mode
-- ============================================================================

-- Add assignment_mode column to interventions
ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS assignment_mode assignment_mode NOT NULL DEFAULT 'single';

COMMENT ON COLUMN interventions.assignment_mode IS 'Mode d''assignation: single (defaut), group (infos partagees), separate (infos isolees par prestataire)';

-- Index for filtering by mode
CREATE INDEX IF NOT EXISTS idx_interventions_assignment_mode
ON interventions(assignment_mode)
WHERE deleted_at IS NULL;

-- ============================================================================
-- SECTION 3: ALTER TABLE intervention_time_slots - Add provider_id
-- ============================================================================

-- Add provider_id to time_slots for mode 'separate'
-- If NULL -> visible by all (group/single mode)
-- If NOT NULL -> visible only by this provider (separate mode)
ALTER TABLE intervention_time_slots
ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN intervention_time_slots.provider_id IS 'Prestataire concerne (NULL = visible par tous en mode group/single, UUID = visible uniquement par ce prestataire en mode separate)';

-- Index for filtering by provider
CREATE INDEX IF NOT EXISTS idx_time_slots_provider
ON intervention_time_slots(provider_id)
WHERE provider_id IS NOT NULL;

-- Composite index for efficient queries by intervention + provider
CREATE INDEX IF NOT EXISTS idx_time_slots_intervention_provider
ON intervention_time_slots(intervention_id, provider_id);

-- ============================================================================
-- SECTION 4: ALTER TABLE intervention_assignments - Add provider_instructions
-- ============================================================================

-- Add provider_instructions for mode 'separate'
ALTER TABLE intervention_assignments
ADD COLUMN IF NOT EXISTS provider_instructions TEXT;

COMMENT ON COLUMN intervention_assignments.provider_instructions IS 'Instructions specifiques pour ce prestataire (utilisees en mode separate)';

-- ============================================================================
-- SECTION 5: NEW TABLE - intervention_links
-- ============================================================================

-- Table for linking parent intervention to child interventions (after closure in separate mode)
CREATE TABLE IF NOT EXISTS intervention_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  parent_intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  child_intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Type de lien
  link_type TEXT NOT NULL DEFAULT 'split_assignment',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES users(id),

  -- Contraintes
  CONSTRAINT unique_parent_child UNIQUE(parent_intervention_id, child_intervention_id),
  CONSTRAINT unique_parent_provider UNIQUE(parent_intervention_id, provider_id),
  CONSTRAINT different_interventions CHECK(parent_intervention_id != child_intervention_id),
  CONSTRAINT valid_link_type CHECK(link_type IN ('split_assignment'))
);

COMMENT ON TABLE intervention_links IS 'Liaison parent-enfant pour interventions en mode separate. A la cloture, des interventions individuelles sont creees et liees.';
COMMENT ON COLUMN intervention_links.parent_intervention_id IS 'Intervention parent (multi-prestataires)';
COMMENT ON COLUMN intervention_links.child_intervention_id IS 'Intervention enfant (1 prestataire)';
COMMENT ON COLUMN intervention_links.provider_id IS 'Prestataire concerne par cette intervention enfant';
COMMENT ON COLUMN intervention_links.link_type IS 'Type de lien: split_assignment (creation a la cloture mode separate)';

-- Indexes for intervention_links
CREATE INDEX IF NOT EXISTS idx_intervention_links_parent
ON intervention_links(parent_intervention_id);

CREATE INDEX IF NOT EXISTS idx_intervention_links_child
ON intervention_links(child_intervention_id);

CREATE INDEX IF NOT EXISTS idx_intervention_links_provider
ON intervention_links(provider_id);

-- ============================================================================
-- SECTION 6: ENABLE RLS on intervention_links
-- ============================================================================

ALTER TABLE intervention_links ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 7: RLS POLICIES for intervention_links
-- ============================================================================

-- SELECT: Visible if user can view parent OR child intervention
CREATE POLICY intervention_links_select ON intervention_links
  FOR SELECT
  USING (
    can_view_intervention(parent_intervention_id)
    OR can_view_intervention(child_intervention_id)
  );

-- INSERT: Only managers of the parent intervention's team
CREATE POLICY intervention_links_insert ON intervention_links
  FOR INSERT
  WITH CHECK (
    is_manager_of_intervention_team(parent_intervention_id)
  );

-- DELETE: Only managers of the parent intervention's team
CREATE POLICY intervention_links_delete ON intervention_links
  FOR DELETE
  USING (
    is_manager_of_intervention_team(parent_intervention_id)
  );

-- ============================================================================
-- SECTION 8: UPDATE RLS POLICY for intervention_time_slots
-- ============================================================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS time_slots_select ON intervention_time_slots;

-- New SELECT policy: Filter by provider_id in separate mode
CREATE POLICY time_slots_select ON intervention_time_slots
  FOR SELECT
  USING (
    can_view_intervention(intervention_id)
    AND (
      -- Mode single/group OR provider_id is NULL: visible by all participants
      provider_id IS NULL
      OR
      -- Mode separate: visible only by this provider
      provider_id = auth.uid()
      OR
      -- Managers always see all slots
      is_manager_of_intervention_team(intervention_id)
    )
  );

-- ============================================================================
-- SECTION 9: HELPER FUNCTION - get_provider_auth_uid()
-- ============================================================================

-- Helper to get the auth user's users.id (not auth.uid())
CREATE OR REPLACE FUNCTION get_user_id_from_auth()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION get_user_id_from_auth() IS 'Retourne l''UUID de la table users correspondant a auth.uid() (pour les cas ou provider_id reference users.id et non auth.users.id)';

-- ============================================================================
-- SECTION 10: HELPER FUNCTION - is_provider_of_intervention()
-- ============================================================================

CREATE OR REPLACE FUNCTION is_provider_of_intervention(p_intervention_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM intervention_assignments ia
    WHERE ia.intervention_id = p_intervention_id
      AND ia.user_id = auth.uid()
      AND ia.role = 'prestataire'
  );
END;
$$;

COMMENT ON FUNCTION is_provider_of_intervention IS 'Verifie si auth.uid() est un prestataire assigne a l''intervention';

-- ============================================================================
-- SECTION 11: HELPER FUNCTION - can_view_time_slot_for_provider()
-- ============================================================================

CREATE OR REPLACE FUNCTION can_view_time_slot_for_provider(p_slot_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_intervention_id UUID;
  v_provider_id UUID;
  v_assignment_mode assignment_mode;
BEGIN
  -- Get slot info
  SELECT
    ts.intervention_id,
    ts.provider_id
  INTO v_intervention_id, v_provider_id
  FROM intervention_time_slots ts
  WHERE ts.id = p_slot_id;

  -- If no slot found, deny
  IF v_intervention_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Managers can see all
  IF is_manager_of_intervention_team(v_intervention_id) THEN
    RETURN TRUE;
  END IF;

  -- If provider_id is NULL, visible to all participants
  IF v_provider_id IS NULL THEN
    RETURN can_view_intervention(v_intervention_id);
  END IF;

  -- If provider_id is set, only that provider can see it
  RETURN v_provider_id = auth.uid();
END;
$$;

COMMENT ON FUNCTION can_view_time_slot_for_provider IS 'Verifie si auth.uid() peut voir le creneau selon le mode d''assignation';

-- ============================================================================
-- SECTION 12: HELPER FUNCTION - get_linked_interventions()
-- ============================================================================

CREATE OR REPLACE FUNCTION get_linked_interventions(p_intervention_id UUID)
RETURNS TABLE (
  link_id UUID,
  parent_id UUID,
  child_id UUID,
  provider_id UUID,
  link_type TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    il.id,
    il.parent_intervention_id,
    il.child_intervention_id,
    il.provider_id,
    il.link_type,
    il.created_at
  FROM intervention_links il
  WHERE il.parent_intervention_id = p_intervention_id
     OR il.child_intervention_id = p_intervention_id;
END;
$$;

COMMENT ON FUNCTION get_linked_interventions IS 'Retourne les interventions liees (parent ou enfants)';

-- ============================================================================
-- SECTION 13: INDEX for better performance
-- ============================================================================

-- Index for querying interventions by mode with status
CREATE INDEX IF NOT EXISTS idx_interventions_mode_status
ON interventions(assignment_mode, status)
WHERE deleted_at IS NULL;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
