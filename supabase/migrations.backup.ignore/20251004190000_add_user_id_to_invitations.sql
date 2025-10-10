-- ✅ Migration: Ajouter colonne user_id à user_invitations
-- Date: 2025-10-04 19:00
-- Objectif: Permettre de relier l'invitation au profil utilisateur existant

-- ✅ ÉTAPE 1: Ajouter la colonne user_id (nullable pour compatibilité avec invitations existantes)
ALTER TABLE public.user_invitations
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

-- ✅ ÉTAPE 2: Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_user_invitations_user_id
ON public.user_invitations(user_id);

-- ✅ ÉTAPE 3: Ajouter un commentaire pour documenter
COMMENT ON COLUMN public.user_invitations.user_id IS
'Référence au profil utilisateur existant (créé avant l''invitation). Permet de relier l''auth au profil quand user accepte.';

-- ✅ VALIDATION
DO $$
BEGIN
  -- Vérifier que la colonne existe
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_invitations'
    AND column_name = 'user_id'
  ) THEN
    RAISE NOTICE '✅ Column user_id added successfully to user_invitations';
  ELSE
    RAISE EXCEPTION '❌ Failed to add user_id column';
  END IF;

  -- Vérifier que l'index existe
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'user_invitations'
    AND indexname = 'idx_user_invitations_user_id'
  ) THEN
    RAISE NOTICE '✅ Index idx_user_invitations_user_id created successfully';
  ELSE
    RAISE WARNING '⚠️ Index idx_user_invitations_user_id not found';
  END IF;

  -- Afficher la structure finale
  RAISE NOTICE '📋 user_invitations columns: %', (
    SELECT string_agg(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_invitations'
  );
END $$;
