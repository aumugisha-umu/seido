-- ============================================================================
-- Relax valid_intervention_location: allow both NULL for AI phone calls
-- ============================================================================
-- The original XOR constraint required exactly one of building_id/lot_id.
-- AI phone interventions may not have an identifiable property.
-- The gestionnaire assigns the location manually afterward.
--
-- New logic: at most one can be set (both NULL OK, one set OK, both set NOT OK)
-- ============================================================================

ALTER TABLE interventions
  DROP CONSTRAINT IF EXISTS valid_intervention_location;

ALTER TABLE interventions
  ADD CONSTRAINT valid_intervention_location CHECK (
    NOT (building_id IS NOT NULL AND lot_id IS NOT NULL)
  );

COMMENT ON CONSTRAINT valid_intervention_location ON interventions IS
  'At most one of building_id/lot_id can be set. Both NULL allowed (e.g. AI phone calls with unknown location).';
