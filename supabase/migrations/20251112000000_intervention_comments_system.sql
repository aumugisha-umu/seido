-- ============================================================================
-- Migration: Système de commentaires pour interventions
-- Date: 2025-11-12
-- Description: Crée une table séparée pour les commentaires d'intervention
--              et supprime les anciennes colonnes (tenant_comment, etc.)
-- ============================================================================

-- Créer la table intervention_comments
CREATE TABLE IF NOT EXISTS public.intervention_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  CONSTRAINT intervention_comments_valid_content
    CHECK (length(trim(content)) >= 1 AND length(content) <= 2000)
);

-- Index pour performance
CREATE INDEX idx_intervention_comments_intervention_id
  ON public.intervention_comments(intervention_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_intervention_comments_user_id
  ON public.intervention_comments(user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_intervention_comments_created_at
  ON public.intervention_comments(created_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_intervention_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER intervention_comments_updated_at
BEFORE UPDATE ON public.intervention_comments
FOR EACH ROW
EXECUTE FUNCTION update_intervention_comments_updated_at();

-- Commentaires sur la table et colonnes
COMMENT ON TABLE public.intervention_comments IS
  'Commentaires sur les interventions - système multi-utilisateurs';
COMMENT ON COLUMN public.intervention_comments.content IS
  'Contenu du commentaire (1-2000 caractères)';
COMMENT ON COLUMN public.intervention_comments.deleted_at IS
  'Soft delete - commentaire archivé mais conservé pour audit';

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE public.intervention_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: Tous les participants de l'intervention peuvent lire les commentaires
CREATE POLICY intervention_comments_select ON public.intervention_comments
FOR SELECT USING (
  intervention_id IN (
    SELECT intervention_id FROM get_accessible_intervention_ids()
  )
  AND deleted_at IS NULL
);

-- INSERT: Gestionnaires uniquement
CREATE POLICY intervention_comments_insert_gestionnaire ON public.intervention_comments
FOR INSERT WITH CHECK (
  is_gestionnaire()
  AND intervention_id IN (
    SELECT intervention_id FROM get_accessible_intervention_ids()
  )
  AND user_id = get_current_user_id()
);

-- UPDATE: Propriétaire du commentaire uniquement (soft delete via UPDATE)
CREATE POLICY intervention_comments_update_owner ON public.intervention_comments
FOR UPDATE USING (
  user_id = get_current_user_id()
  OR is_admin()
)
WITH CHECK (
  user_id = get_current_user_id()
  OR is_admin()
);

-- ============================================================================
-- Suppression des anciennes colonnes
-- ============================================================================

-- Supprimer les anciennes colonnes de commentaires
ALTER TABLE public.interventions
DROP COLUMN IF EXISTS tenant_comment;

ALTER TABLE public.interventions
DROP COLUMN IF EXISTS manager_comment;

ALTER TABLE public.interventions
DROP COLUMN IF EXISTS provider_comment;

-- Note: Après cette migration, exécuter `npm run supabase:types`
