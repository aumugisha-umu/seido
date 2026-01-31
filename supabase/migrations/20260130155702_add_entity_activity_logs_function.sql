-- Migration: Create RPC function for hierarchical entity activity logs
-- This function fetches activity logs for an entity AND its related entities

CREATE OR REPLACE FUNCTION get_entity_activity_logs(
  p_team_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_include_related BOOLEAN DEFAULT TRUE,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  -- Colonnes compatibles avec activity_logs_with_user view
  id UUID,
  team_id UUID,
  user_id UUID,
  action_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  description TEXT,
  status TEXT,
  metadata JSONB,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ,
  -- User info (from join)
  user_name TEXT,
  user_email TEXT,
  user_avatar_url TEXT,
  user_role TEXT,
  -- Source entity info (pour affichage contexte)
  source_entity_type TEXT,
  source_entity_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER  -- Respecte RLS
AS $$
BEGIN
  -- Mode simple: juste l'entité elle-même
  IF NOT p_include_related THEN
    RETURN QUERY
    SELECT
      al.id, al.team_id, al.user_id,
      al.action_type::TEXT, al.entity_type::TEXT, al.entity_id,
      al.entity_name, al.description, al.status::TEXT, al.metadata,
      al.error_message, al.ip_address, al.user_agent, al.created_at,
      u.name, u.email, u.avatar_url, u.role::TEXT,
      p_entity_type, al.entity_name
    FROM activity_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE al.team_id = p_team_id
      AND al.entity_type::TEXT = p_entity_type
      AND al.entity_id = p_entity_id
    ORDER BY al.created_at DESC
    LIMIT p_limit;
    RETURN;
  END IF;

  -- Mode avec entités liées
  RETURN QUERY
  WITH related_entities AS (
    -- === BUILDING ===
    -- Building itself
    SELECT 'building'::TEXT as rel_type, p_entity_id as rel_id, NULL::TEXT as rel_name
    WHERE p_entity_type = 'building'

    UNION ALL
    -- Lots of building
    SELECT 'lot', l.id, l.reference FROM lots l
    WHERE p_entity_type = 'building' AND l.building_id = p_entity_id

    UNION ALL
    -- Contracts on building's lots
    SELECT 'contract', c.id, c.title FROM contracts c
    WHERE p_entity_type = 'building'
      AND c.lot_id IN (SELECT l2.id FROM lots l2 WHERE l2.building_id = p_entity_id)

    UNION ALL
    -- Interventions on building or its lots
    SELECT 'intervention', i.id, i.reference FROM interventions i
    WHERE p_entity_type = 'building'
      AND (i.building_id = p_entity_id
           OR i.lot_id IN (SELECT l3.id FROM lots l3 WHERE l3.building_id = p_entity_id))

    -- === LOT ===
    UNION ALL
    SELECT 'lot', p_entity_id, NULL WHERE p_entity_type = 'lot'

    UNION ALL
    SELECT 'contract', c.id, c.title FROM contracts c
    WHERE p_entity_type = 'lot' AND c.lot_id = p_entity_id

    UNION ALL
    SELECT 'intervention', i.id, i.reference FROM interventions i
    WHERE p_entity_type = 'lot' AND i.lot_id = p_entity_id

    -- === CONTRACT ===
    UNION ALL
    SELECT 'contract', p_entity_id, NULL WHERE p_entity_type = 'contract'

    -- === CONTACT ===
    UNION ALL
    SELECT 'contact', p_entity_id, NULL WHERE p_entity_type = 'contact'

    UNION ALL
    -- Interventions where contact is assigned
    SELECT 'intervention', ia.intervention_id, i.reference
    FROM intervention_assignments ia
    JOIN interventions i ON i.id = ia.intervention_id
    WHERE p_entity_type = 'contact' AND ia.user_id = p_entity_id

    -- === INTERVENTION (self only for this function) ===
    UNION ALL
    SELECT 'intervention', p_entity_id, NULL WHERE p_entity_type = 'intervention'
  )
  SELECT
    al.id, al.team_id, al.user_id,
    al.action_type::TEXT, al.entity_type::TEXT, al.entity_id,
    al.entity_name, al.description, al.status::TEXT, al.metadata,
    al.error_message, al.ip_address, al.user_agent, al.created_at,
    u.name, u.email, u.avatar_url, u.role::TEXT,
    re.rel_type, COALESCE(re.rel_name, al.entity_name)
  FROM activity_logs al
  JOIN related_entities re
    ON re.rel_type = al.entity_type::TEXT
    AND re.rel_id = al.entity_id
  LEFT JOIN users u ON u.id = al.user_id
  WHERE al.team_id = p_team_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Documentation
COMMENT ON FUNCTION get_entity_activity_logs IS
'Récupère les activity logs pour une entité et ses entités liées (hiérarchie).
- Building: logs du building + lots + contracts + interventions
- Lot: logs du lot + contracts + interventions
- Contract: logs du contract uniquement
- Contact: logs du contact + interventions assignées
- Intervention: logs de l''intervention uniquement
Utilisé par EntityActivityLog component. Respecte RLS via SECURITY INVOKER.';
