-- Migration: 20260113000000_add_email_conversation_support.sql
-- Description: Étendre conversation_threads pour supporter les conversations liées aux emails
-- Permet aux gestionnaires de démarrer des discussions internes sur un email

-- 1. Ajouter 'email_internal' au type enum conversation_thread_type
-- Note: Les valeurs enum ne peuvent pas être supprimées, seulement ajoutées
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'email_internal'
        AND enumtypid = 'conversation_thread_type'::regtype
    ) THEN
        ALTER TYPE conversation_thread_type ADD VALUE 'email_internal';
    END IF;
END$$;

-- 2. Ajouter colonne email_id pour lier les conversations aux emails
ALTER TABLE conversation_threads
ADD COLUMN IF NOT EXISTS email_id UUID REFERENCES emails(id) ON DELETE CASCADE;

-- 3. Rendre intervention_id nullable (était NOT NULL)
-- Les conversations peuvent maintenant être liées à un email OU une intervention
ALTER TABLE conversation_threads
ALTER COLUMN intervention_id DROP NOT NULL;

-- 4. Ajouter contrainte CHECK: exactement UN des deux doit être rempli (XOR)
-- Cela garantit l'intégrité des données
ALTER TABLE conversation_threads
DROP CONSTRAINT IF EXISTS valid_thread_link;

ALTER TABLE conversation_threads
ADD CONSTRAINT valid_thread_link CHECK (
    (intervention_id IS NOT NULL AND email_id IS NULL) OR
    (intervention_id IS NULL AND email_id IS NOT NULL)
);

-- 5. Index pour recherche rapide par email_id
CREATE INDEX IF NOT EXISTS idx_conversation_threads_email_id
ON conversation_threads(email_id)
WHERE email_id IS NOT NULL;

-- 6. Mettre à jour la contrainte unique pour inclure email_id
-- NULLS NOT DISTINCT: deux NULL sont considérés égaux (évite les doublons)
ALTER TABLE conversation_threads
DROP CONSTRAINT IF EXISTS unique_intervention_thread_type;

ALTER TABLE conversation_threads
DROP CONSTRAINT IF EXISTS unique_thread_link_type;

ALTER TABLE conversation_threads
ADD CONSTRAINT unique_thread_link_type
UNIQUE NULLS NOT DISTINCT (intervention_id, email_id, thread_type);

-- 7. Mettre à jour la fonction can_view_conversation pour supporter les emails
CREATE OR REPLACE FUNCTION can_view_conversation(p_thread_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_thread RECORD;
    v_user_db_id UUID;
BEGIN
    -- Récupérer l'ID utilisateur DB depuis auth.uid()
    SELECT id INTO v_user_db_id
    FROM users
    WHERE auth_user_id = auth.uid();

    IF v_user_db_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Récupérer le thread
    SELECT * INTO v_thread
    FROM conversation_threads
    WHERE id = p_thread_id;

    IF v_thread IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Cas 1: Thread lié à un EMAIL
    -- Seuls les gestionnaires de l'équipe peuvent voir
    IF v_thread.email_id IS NOT NULL THEN
        RETURN is_team_manager(v_thread.team_id);
    END IF;

    -- Cas 2: Thread lié à une INTERVENTION (logique existante)
    -- Le user est participant OU gestionnaire de l'équipe
    RETURN EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.thread_id = p_thread_id
        AND cp.user_id = v_user_db_id
    ) OR is_manager_of_intervention_team(v_thread.intervention_id);
END;
$$;

-- 8. Commentaires pour documentation
COMMENT ON COLUMN conversation_threads.email_id IS
    'UUID de l''email lié. Exclusif avec intervention_id (contrainte XOR).';
COMMENT ON CONSTRAINT valid_thread_link ON conversation_threads IS
    'Garantit qu''un thread est lié à exactement UN des deux: intervention_id OU email_id';

-- Note: Les politiques RLS existantes utilisent can_view_conversation()
-- qui a été mise à jour ci-dessus, donc elles fonctionnent automatiquement
-- pour les conversations email.
