-- ============================================================================
-- Migration: Ajouter is_internal aux commentaires d'intervention
-- Date: 2026-01-29
-- Description: Permet de distinguer les commentaires internes (gestionnaire)
--              des commentaires publics (visibles par tous les participants)
-- ============================================================================

-- Ajouter la colonne is_internal
ALTER TABLE public.intervention_comments
ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;

-- Index pour performance sur les commentaires internes
CREATE INDEX IF NOT EXISTS idx_intervention_comments_is_internal
  ON public.intervention_comments(is_internal)
  WHERE deleted_at IS NULL;

-- Commentaire sur la colonne
COMMENT ON COLUMN public.intervention_comments.is_internal IS
  'Si true, commentaire visible uniquement par l''équipe de gestion (gestionnaires/admins)';

-- ============================================================================
-- Mise à jour des RLS Policies
-- ============================================================================

-- Supprimer l'ancienne politique SELECT
DROP POLICY IF EXISTS intervention_comments_select ON public.intervention_comments;

-- Nouvelle politique SELECT: filtre les commentaires internes selon le rôle
-- Les gestionnaires/admins voient tout, les autres ne voient que les commentaires publics
CREATE POLICY intervention_comments_select ON public.intervention_comments
FOR SELECT USING (
  intervention_id IN (
    SELECT intervention_id FROM get_accessible_intervention_ids()
  )
  AND deleted_at IS NULL
  AND (
    -- Les gestionnaires et admins voient tout
    is_gestionnaire() OR is_admin()
    -- Les autres ne voient que les commentaires non-internes
    OR NOT is_internal
  )
);

-- ============================================================================
-- Note: Après cette migration, exécuter `npm run supabase:types`
-- ============================================================================
