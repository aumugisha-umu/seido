-- Migration: Add indexes for entity activity logs performance
-- These indexes optimize the RPC function subqueries

-- Index for activity_logs lookups by entity
CREATE INDEX IF NOT EXISTS idx_activity_logs_team_entity
  ON activity_logs(team_id, entity_type, entity_id);

-- Index for activity_logs sorted by date
CREATE INDEX IF NOT EXISTS idx_activity_logs_team_created
  ON activity_logs(team_id, created_at DESC);

-- Index for lots -> building relationship (subquery optimization)
CREATE INDEX IF NOT EXISTS idx_lots_building_id
  ON lots(building_id)
  WHERE building_id IS NOT NULL;

-- Index for contracts -> lot relationship (subquery optimization)
CREATE INDEX IF NOT EXISTS idx_contracts_lot_id
  ON contracts(lot_id)
  WHERE lot_id IS NOT NULL;

-- Index for interventions -> building/lot relationships (subquery optimization)
CREATE INDEX IF NOT EXISTS idx_interventions_building_id
  ON interventions(building_id)
  WHERE building_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interventions_lot_id
  ON interventions(lot_id)
  WHERE lot_id IS NOT NULL;

-- Index for intervention_assignments -> user (for contact activity)
CREATE INDEX IF NOT EXISTS idx_intervention_assignments_user_id
  ON intervention_assignments(user_id);

-- Comment
COMMENT ON INDEX idx_activity_logs_team_entity IS
'Optimizes activity logs lookups by team + entity type + entity id';
