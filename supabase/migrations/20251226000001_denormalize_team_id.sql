-- ============================================================================
-- Migration: Dénormalisation team_id pour optimisation RLS
-- Date: 2025-12-26
-- Description: Ajoute team_id direct sur 4 tables pour éliminer les JOINs
--              coûteux dans les politiques RLS
-- Impact: Performance RLS x2-100 selon la table
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: AJOUTER LES COLONNES team_id (NULLABLE d'abord)
-- ============================================================================

-- 1.1 conversation_messages (CRITIQUE - 3 JOINs actuellement)
ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- 1.2 building_contacts (1 JOIN actuellement)
ALTER TABLE building_contacts
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- 1.3 lot_contacts (1-2 JOINs actuellement)
ALTER TABLE lot_contacts
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- 1.4 intervention_time_slots (1 JOIN actuellement)
ALTER TABLE intervention_time_slots
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- ============================================================================
-- ÉTAPE 2: PEUPLER LES DONNÉES EXISTANTES
-- ============================================================================

-- 2.1 conversation_messages (via thread → intervention → team)
UPDATE conversation_messages cm
SET team_id = (
  SELECT i.team_id
  FROM conversation_threads ct
  JOIN interventions i ON ct.intervention_id = i.id
  WHERE ct.id = cm.thread_id
)
WHERE cm.team_id IS NULL;

-- 2.2 building_contacts (via building → team)
UPDATE building_contacts bc
SET team_id = (
  SELECT b.team_id
  FROM buildings b
  WHERE b.id = bc.building_id
)
WHERE bc.team_id IS NULL;

-- 2.3 lot_contacts (via lot → [building] → team)
-- Gère les lots standalone (team_id direct) ET les lots nested (via building)
UPDATE lot_contacts lc
SET team_id = (
  SELECT COALESCE(b.team_id, l.team_id)
  FROM lots l
  LEFT JOIN buildings b ON l.building_id = b.id
  WHERE l.id = lc.lot_id
)
WHERE lc.team_id IS NULL;

-- 2.4 intervention_time_slots (via intervention → team)
UPDATE intervention_time_slots its
SET team_id = (
  SELECT i.team_id
  FROM interventions i
  WHERE i.id = its.intervention_id
)
WHERE its.team_id IS NULL;

-- ============================================================================
-- ÉTAPE 3: AJOUTER CONTRAINTES NOT NULL
-- (Seulement si toutes les lignes ont une valeur)
-- ============================================================================

-- Note: On ne force pas NOT NULL pour l'instant car il pourrait y avoir
-- des données orphelines. On le fera dans une migration suivante après validation.

-- Alternative: Vérification et alerte si données manquantes
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Vérifier conversation_messages
  SELECT COUNT(*) INTO v_count FROM conversation_messages WHERE team_id IS NULL;
  IF v_count > 0 THEN
    RAISE WARNING 'conversation_messages: % lignes sans team_id', v_count;
  END IF;

  -- Vérifier building_contacts
  SELECT COUNT(*) INTO v_count FROM building_contacts WHERE team_id IS NULL;
  IF v_count > 0 THEN
    RAISE WARNING 'building_contacts: % lignes sans team_id', v_count;
  END IF;

  -- Vérifier lot_contacts
  SELECT COUNT(*) INTO v_count FROM lot_contacts WHERE team_id IS NULL;
  IF v_count > 0 THEN
    RAISE WARNING 'lot_contacts: % lignes sans team_id', v_count;
  END IF;

  -- Vérifier intervention_time_slots
  SELECT COUNT(*) INTO v_count FROM intervention_time_slots WHERE team_id IS NULL;
  IF v_count > 0 THEN
    RAISE WARNING 'intervention_time_slots: % lignes sans team_id', v_count;
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 4: CRÉER LES TRIGGERS DE MAINTIEN
-- ============================================================================

-- 4.1 Trigger pour conversation_messages
CREATE OR REPLACE FUNCTION sync_message_team_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.team_id IS NULL THEN
    SELECT i.team_id INTO NEW.team_id
    FROM conversation_threads ct
    JOIN interventions i ON ct.intervention_id = i.id
    WHERE ct.id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_conversation_messages_team_id ON conversation_messages;
CREATE TRIGGER tr_conversation_messages_team_id
BEFORE INSERT ON conversation_messages
FOR EACH ROW
EXECUTE FUNCTION sync_message_team_id();

-- 4.2 Trigger pour building_contacts
CREATE OR REPLACE FUNCTION sync_building_contact_team_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.team_id IS NULL THEN
    SELECT team_id INTO NEW.team_id
    FROM buildings
    WHERE id = NEW.building_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_building_contacts_team_id ON building_contacts;
CREATE TRIGGER tr_building_contacts_team_id
BEFORE INSERT ON building_contacts
FOR EACH ROW
EXECUTE FUNCTION sync_building_contact_team_id();

-- 4.3 Trigger pour lot_contacts
CREATE OR REPLACE FUNCTION sync_lot_contact_team_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.team_id IS NULL THEN
    SELECT COALESCE(b.team_id, l.team_id) INTO NEW.team_id
    FROM lots l
    LEFT JOIN buildings b ON l.building_id = b.id
    WHERE l.id = NEW.lot_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_lot_contacts_team_id ON lot_contacts;
CREATE TRIGGER tr_lot_contacts_team_id
BEFORE INSERT ON lot_contacts
FOR EACH ROW
EXECUTE FUNCTION sync_lot_contact_team_id();

-- 4.4 Trigger pour intervention_time_slots
CREATE OR REPLACE FUNCTION sync_time_slot_team_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.team_id IS NULL THEN
    SELECT team_id INTO NEW.team_id
    FROM interventions
    WHERE id = NEW.intervention_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_intervention_time_slots_team_id ON intervention_time_slots;
CREATE TRIGGER tr_intervention_time_slots_team_id
BEFORE INSERT ON intervention_time_slots
FOR EACH ROW
EXECUTE FUNCTION sync_time_slot_team_id();

-- ============================================================================
-- ÉTAPE 5: CRÉER LES INDEXES SUR team_id
-- ============================================================================

-- Note: On n'utilise pas CONCURRENTLY dans une migration transactionnelle
-- Si nécessaire, exécuter manuellement après la migration

CREATE INDEX IF NOT EXISTS idx_conversation_messages_team
ON conversation_messages(team_id);

CREATE INDEX IF NOT EXISTS idx_building_contacts_team
ON building_contacts(team_id);

CREATE INDEX IF NOT EXISTS idx_lot_contacts_team
ON lot_contacts(team_id);

CREATE INDEX IF NOT EXISTS idx_intervention_time_slots_team
ON intervention_time_slots(team_id);

-- ============================================================================
-- ÉTAPE 6: METTRE À JOUR LES POLITIQUES RLS
-- ============================================================================

-- 6.1 conversation_messages - Nouvelles politiques optimisées
DROP POLICY IF EXISTS messages_select ON conversation_messages;
CREATE POLICY messages_select ON conversation_messages
FOR SELECT USING (
  deleted_at IS NULL
  AND (
    is_admin()
    OR is_team_manager(team_id)
    OR user_id = get_current_user_id()
  )
);

DROP POLICY IF EXISTS messages_insert ON conversation_messages;
CREATE POLICY messages_insert ON conversation_messages
FOR INSERT WITH CHECK (
  is_team_manager(team_id)
  OR EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.thread_id = conversation_messages.thread_id
    AND cp.user_id = get_current_user_id()
  )
);

DROP POLICY IF EXISTS messages_update ON conversation_messages;
CREATE POLICY messages_update ON conversation_messages
FOR UPDATE USING (
  deleted_at IS NULL
  AND (
    is_admin()
    OR is_team_manager(team_id)
    OR user_id = get_current_user_id()
  )
);

DROP POLICY IF EXISTS messages_delete ON conversation_messages;
CREATE POLICY messages_delete ON conversation_messages
FOR DELETE USING (
  is_admin()
  OR is_team_manager(team_id)
);

-- 6.2 building_contacts - Nouvelles politiques optimisées
DROP POLICY IF EXISTS building_contacts_select ON building_contacts;
CREATE POLICY building_contacts_select ON building_contacts
FOR SELECT USING (
  is_admin()
  OR is_team_manager(team_id)
);

DROP POLICY IF EXISTS building_contacts_insert ON building_contacts;
CREATE POLICY building_contacts_insert ON building_contacts
FOR INSERT WITH CHECK (
  is_team_manager(team_id)
);

DROP POLICY IF EXISTS building_contacts_update ON building_contacts;
CREATE POLICY building_contacts_update ON building_contacts
FOR UPDATE USING (
  is_team_manager(team_id)
);

DROP POLICY IF EXISTS building_contacts_delete ON building_contacts;
CREATE POLICY building_contacts_delete ON building_contacts
FOR DELETE USING (
  is_team_manager(team_id)
);

-- 6.3 lot_contacts - Nouvelles politiques optimisées
DROP POLICY IF EXISTS lot_contacts_select ON lot_contacts;
CREATE POLICY lot_contacts_select ON lot_contacts
FOR SELECT USING (
  is_admin()
  OR is_team_manager(team_id)
  OR user_id = get_current_user_id()
);

DROP POLICY IF EXISTS lot_contacts_insert ON lot_contacts;
CREATE POLICY lot_contacts_insert ON lot_contacts
FOR INSERT WITH CHECK (
  is_team_manager(team_id)
);

DROP POLICY IF EXISTS lot_contacts_update ON lot_contacts;
CREATE POLICY lot_contacts_update ON lot_contacts
FOR UPDATE USING (
  is_team_manager(team_id)
);

DROP POLICY IF EXISTS lot_contacts_delete ON lot_contacts;
CREATE POLICY lot_contacts_delete ON lot_contacts
FOR DELETE USING (
  is_team_manager(team_id)
);

-- 6.4 intervention_time_slots - Nouvelles politiques optimisées
DROP POLICY IF EXISTS time_slots_select ON intervention_time_slots;
CREATE POLICY time_slots_select ON intervention_time_slots
FOR SELECT USING (
  is_admin()
  OR is_team_manager(team_id)
  OR is_assigned_to_intervention(intervention_id)
);

DROP POLICY IF EXISTS time_slots_insert ON intervention_time_slots;
CREATE POLICY time_slots_insert ON intervention_time_slots
FOR INSERT WITH CHECK (
  is_team_manager(team_id)
  OR is_assigned_to_intervention(intervention_id)
);

DROP POLICY IF EXISTS time_slots_update ON intervention_time_slots;
CREATE POLICY time_slots_update ON intervention_time_slots
FOR UPDATE USING (
  is_team_manager(team_id)
  OR is_assigned_to_intervention(intervention_id)
);

DROP POLICY IF EXISTS time_slots_delete ON intervention_time_slots;
CREATE POLICY time_slots_delete ON intervention_time_slots
FOR DELETE USING (
  is_team_manager(team_id)
);

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================

COMMENT ON COLUMN conversation_messages.team_id IS
'Team ID dénormalisé pour optimisation RLS. Maintenu par trigger sync_message_team_id()';

COMMENT ON COLUMN building_contacts.team_id IS
'Team ID dénormalisé pour optimisation RLS. Maintenu par trigger sync_building_contact_team_id()';

COMMENT ON COLUMN lot_contacts.team_id IS
'Team ID dénormalisé pour optimisation RLS. Maintenu par trigger sync_lot_contact_team_id()';

COMMENT ON COLUMN intervention_time_slots.team_id IS
'Team ID dénormalisé pour optimisation RLS. Maintenu par trigger sync_time_slot_team_id()';
