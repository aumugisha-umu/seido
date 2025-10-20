-- ============================================================================
-- Migration: Fix log_intervention_status_change trigger for service role
-- Date: 2025-10-20
-- Description: Le trigger échoue quand on utilise le service role client car
--              get_current_user_id() retourne NULL (pas de auth.uid())
-- Fix: Utiliser un fallback vers le tenant_id ou le premier gestionnaire assigné
-- ============================================================================

CREATE OR REPLACE FUNCTION log_intervention_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Essayer get_current_user_id() d'abord (utilisateur authentifié)
    v_user_id := get_current_user_id();

    -- Si NULL (service role), chercher le locataire assigné (remplace tenant_id supprimé)
    IF v_user_id IS NULL THEN
      SELECT user_id INTO v_user_id
      FROM intervention_assignments
      WHERE intervention_id = NEW.id
        AND role = 'locataire'
      LIMIT 1;
    END IF;

    -- Si encore NULL, chercher premier gestionnaire assigné
    IF v_user_id IS NULL THEN
      SELECT user_id INTO v_user_id
      FROM intervention_assignments
      WHERE intervention_id = NEW.id
        AND role = 'gestionnaire'
      LIMIT 1;
    END IF;

    -- Si TOUJOURS NULL, utiliser le premier user assigné peu importe le rôle
    IF v_user_id IS NULL THEN
      SELECT user_id INTO v_user_id
      FROM intervention_assignments
      WHERE intervention_id = NEW.id
      LIMIT 1;
    END IF;

    -- Si TOUJOURS NULL après tous les fallbacks, skip le log
    -- (ne pas bloquer l'opération pour un problème de logging)
    IF v_user_id IS NOT NULL THEN
      INSERT INTO activity_logs (
        team_id,
        user_id,
        action_type,
        entity_type,
        entity_id,
        entity_name,
        description,
        metadata
      ) VALUES (
        NEW.team_id,
        v_user_id,  -- Utilise la variable avec fallback
        'status_change',
        'intervention',
        NEW.id,
        NEW.reference,
        'Changement statut: ' || OLD.status || ' → ' || NEW.status,
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status,
          'intervention_title', NEW.title,
          'is_system_action', get_current_user_id() IS NULL  -- Flag pour opérations système
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_intervention_status_change() IS
'✅ FIXÉ: Gère le cas service role avec fallbacks hiérarchiques (tenant → gestionnaire → premier assigné). Ne bloque jamais l''UPDATE si aucun user trouvé.';
