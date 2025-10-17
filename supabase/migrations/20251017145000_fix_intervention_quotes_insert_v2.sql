-- ============================================================================
-- Migration: Fix intervention_quotes INSERT policy V2 - Replicate assignments pattern
-- Date: 2025-10-17
-- Description: Replicate exact working pattern from intervention_assignments
--              Simplified logic using is_manager_of_intervention_team() helper
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "quotes_insert" ON public.intervention_quotes;

-- Create new policy replicating intervention_assignments pattern exactly
CREATE POLICY "quotes_insert"
ON public.intervention_quotes
FOR INSERT
TO authenticated
WITH CHECK (
  -- CASE 1: User is manager of the intervention's team
  is_manager_of_intervention_team(intervention_id)

  OR

  -- CASE 2: User is the one creating the quote (for managers creating quote requests)
  created_by IN (
    SELECT u.id FROM public.users u
    WHERE u.auth_user_id = auth.uid()
  )

  OR

  -- CASE 3: Provider creating their own quote submission
  (
    provider_id IN (
      SELECT u.id FROM public.users u
      WHERE u.auth_user_id = auth.uid()
    )
    AND is_assigned_to_intervention(intervention_id)
  )
);

COMMENT ON POLICY "quotes_insert" ON public.intervention_quotes IS
'Pattern répliqué depuis intervention_assignments: permet managers (via helper + created_by) et prestataires assignés';
