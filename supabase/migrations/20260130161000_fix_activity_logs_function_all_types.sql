-- Fix: Cast all VARCHAR columns to TEXT to match RETURNS TABLE definition
-- users.name, users.email, users.avatar_url are VARCHAR(255), not TEXT

DROP FUNCTION IF EXISTS get_entity_activity_logs(UUID, TEXT, UUID, BOOLEAN, INT);

CREATE OR REPLACE FUNCTION get_entity_activity_logs(
  p_team_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_include_related BOOLEAN DEFAULT TRUE,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
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
  user_name TEXT,
  user_email TEXT,
  user_avatar_url TEXT,
  user_role TEXT,
  source_entity_type TEXT,
  source_entity_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
  -- Mode simple: juste l'entité elle-même
  IF NOT p_include_related THEN
    RETURN QUERY
    SELECT
      al.id, al.team_id, al.user_id,
      al.action_type::TEXT, al.entity_type::TEXT, al.entity_id,
      al.entity_name::TEXT, al.description::TEXT, al.status::TEXT, al.metadata,
      al.error_message::TEXT, al.ip_address, al.user_agent::TEXT, al.created_at,
      u.name::TEXT, u.email::TEXT, u.avatar_url::TEXT, u.role::TEXT,
      p_entity_type::TEXT, al.entity_name::TEXT
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
    SELECT 'building'::TEXT as rel_type, p_entity_id as rel_id, NULL::TEXT as rel_name
    WHERE p_entity_type = 'building'

    UNION ALL
    SELECT 'lot'::TEXT, l.id, l.reference::TEXT FROM lots l
    WHERE p_entity_type = 'building' AND l.building_id = p_entity_id

    UNION ALL
    SELECT 'contract'::TEXT, c.id, c.title::TEXT FROM contracts c
    WHERE p_entity_type = 'building'
      AND c.lot_id IN (SELECT l2.id FROM lots l2 WHERE l2.building_id = p_entity_id)

    UNION ALL
    SELECT 'intervention'::TEXT, i.id, i.reference::TEXT FROM interventions i
    WHERE p_entity_type = 'building'
      AND (i.building_id = p_entity_id
           OR i.lot_id IN (SELECT l3.id FROM lots l3 WHERE l3.building_id = p_entity_id))

    -- === LOT ===
    UNION ALL
    SELECT 'lot'::TEXT, p_entity_id, NULL::TEXT WHERE p_entity_type = 'lot'

    UNION ALL
    SELECT 'contract'::TEXT, c.id, c.title::TEXT FROM contracts c
    WHERE p_entity_type = 'lot' AND c.lot_id = p_entity_id

    UNION ALL
    SELECT 'intervention'::TEXT, i.id, i.reference::TEXT FROM interventions i
    WHERE p_entity_type = 'lot' AND i.lot_id = p_entity_id

    -- === CONTRACT ===
    UNION ALL
    SELECT 'contract'::TEXT, p_entity_id, NULL::TEXT WHERE p_entity_type = 'contract'

    -- === CONTACT ===
    UNION ALL
    SELECT 'contact'::TEXT, p_entity_id, NULL::TEXT WHERE p_entity_type = 'contact'

    UNION ALL
    SELECT 'intervention'::TEXT, ia.intervention_id, i.reference::TEXT
    FROM intervention_assignments ia
    JOIN interventions i ON i.id = ia.intervention_id
    WHERE p_entity_type = 'contact' AND ia.user_id = p_entity_id

    -- === INTERVENTION ===
    UNION ALL
    SELECT 'intervention'::TEXT, p_entity_id, NULL::TEXT WHERE p_entity_type = 'intervention'
  )
  SELECT
    al.id, al.team_id, al.user_id,
    al.action_type::TEXT, al.entity_type::TEXT, al.entity_id,
    al.entity_name::TEXT, al.description::TEXT, al.status::TEXT, al.metadata,
    al.error_message::TEXT, al.ip_address, al.user_agent::TEXT, al.created_at,
    u.name::TEXT, u.email::TEXT, u.avatar_url::TEXT, u.role::TEXT,
    re.rel_type::TEXT, COALESCE(re.rel_name, al.entity_name)::TEXT
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

COMMENT ON FUNCTION get_entity_activity_logs IS
'Activity logs for entity + related entities. All VARCHAR columns cast to TEXT. v3';
