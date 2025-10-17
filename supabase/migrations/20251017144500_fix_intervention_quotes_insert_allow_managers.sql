-- ============================================================================
-- Migration: Fix intervention_quotes INSERT policy to allow managers
-- Date: 2025-10-17
-- Description: Allow managers to create quote requests (status='pending', amount=0)
--              in addition to providers submitting their own quotes
-- ============================================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "quotes_insert" ON public.intervention_quotes;

-- Create new policy allowing both managers and providers
CREATE POLICY "quotes_insert"
ON public.intervention_quotes
FOR INSERT
TO authenticated
WITH CHECK (
  deleted_at IS NULL
  AND (
    -- CASE 1: Manager from same team can create quote requests
    (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.team_id = intervention_quotes.team_id
        AND u.role IN ('gestionnaire', 'admin')
      )
    )
    OR
    -- CASE 2: Provider can create/submit their own quotes
    (
      provider_id IN (
        SELECT id FROM public.users WHERE auth_user_id = auth.uid()
      )
      AND is_assigned_to_intervention(intervention_id)
    )
  )
);

COMMENT ON POLICY "quotes_insert" ON public.intervention_quotes IS
'Permet aux gestionnaires de créer des demandes de devis (amount=0) et aux prestataires de soumettre leurs propres devis';
