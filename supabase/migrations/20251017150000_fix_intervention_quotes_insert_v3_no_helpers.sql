-- ============================================================================
-- Migration: Fix intervention_quotes INSERT policy V3 - NO HELPERS
-- Date: 2025-10-17
-- Description: Contourne les helpers RLS bugués (auth.uid vs users.id mismatch)
--              Utilise JOINs explicites pour convertir auth.uid() → users.id
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "quotes_insert" ON public.intervention_quotes;

-- Create new policy WITHOUT helper functions
-- Explicit JOINs to handle auth.uid() (auth_user_id) → users.id conversion
CREATE POLICY "quotes_insert"
ON public.intervention_quotes
FOR INSERT
TO authenticated
WITH CHECK (
  deleted_at IS NULL
  AND (
    -- ========================================================================
    -- CASE 1: Manager de l'équipe de l'intervention
    -- ========================================================================
    -- Logique: user est gestionnaire de la team de l'intervention
    EXISTS (
      SELECT 1
      FROM public.users u
      INNER JOIN public.team_members tm ON tm.user_id = u.id
      INNER JOIN public.interventions i ON i.team_id = tm.team_id
      WHERE i.id = intervention_quotes.intervention_id
        AND u.auth_user_id = auth.uid()  -- Conversion auth.uid() → users.id via JOIN
        AND tm.role IN ('gestionnaire', 'admin')
        AND tm.left_at IS NULL
        AND i.deleted_at IS NULL
    )

    OR

    -- ========================================================================
    -- CASE 2: Créateur du quote (manager créant la demande initiale)
    -- ========================================================================
    -- Logique: created_by doit correspondre à l'user connecté
    created_by IN (
      SELECT u.id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
    )

    OR

    -- ========================================================================
    -- CASE 3: Prestataire assigné créant son propre quote
    -- ========================================================================
    -- Logique: provider_id = user connecté ET user assigné comme prestataire
    (
      provider_id IN (
        SELECT u.id
        FROM public.users u
        WHERE u.auth_user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1
        FROM public.intervention_assignments ia
        INNER JOIN public.users u ON u.id = ia.user_id
        WHERE ia.intervention_id = intervention_quotes.intervention_id
          AND u.auth_user_id = auth.uid()  -- Conversion via JOIN
          AND ia.role = 'prestataire'
      )
    )
  )
);

COMMENT ON POLICY "quotes_insert" ON public.intervention_quotes IS
'V3: Contourne helpers RLS bugués. JOINs explicites pour gérer auth.uid() (auth_user_id) vs users.id. Permet: (1) Managers équipe créer demandes, (2) Créateur via created_by, (3) Prestataires assignés soumettre quotes';
