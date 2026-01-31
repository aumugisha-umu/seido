-- Migration: Create centralized addresses table
-- Description: Refactors address storage from multiple tables into a single addresses table
-- with Google Maps geocoding support

-- ============================================
-- TABLE: addresses
-- ============================================
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Address fields (normalized)
  street TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  country country NOT NULL DEFAULT 'belgique',

  -- Google Maps geocoding data
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  place_id TEXT,
  formatted_address TEXT,

  -- Multi-tenant isolation
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT valid_coordinates CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL AND
     latitude >= -90 AND latitude <= 90 AND
     longitude >= -180 AND longitude <= 180)
  )
);

-- ============================================
-- INDEXES
-- ============================================
-- Geo queries index (partial - only geocoded addresses)
CREATE INDEX idx_addresses_coordinates
ON addresses(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Team + location search
CREATE INDEX idx_addresses_team_location
ON addresses(team_id, city, postal_code)
WHERE deleted_at IS NULL;

-- Place ID lookup (for Google cache)
CREATE INDEX idx_addresses_place_id
ON addresses(place_id)
WHERE place_id IS NOT NULL;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE TRIGGER set_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Policy: Team members can view addresses in their team
CREATE POLICY "Team members can view addresses"
ON addresses FOR SELECT
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
);

-- Policy: Gestionnaires and admins can insert addresses
-- Uses is_team_member helper function for role check
CREATE POLICY "Gestionnaires can insert addresses"
ON addresses FOR INSERT
TO authenticated
WITH CHECK (
  is_team_member(team_id, ARRAY['gestionnaire', 'admin'])
);

-- Policy: Gestionnaires and admins can update addresses
CREATE POLICY "Gestionnaires can update addresses"
ON addresses FOR UPDATE
TO authenticated
USING (
  is_team_member(team_id, ARRAY['gestionnaire', 'admin'])
)
WITH CHECK (
  is_team_member(team_id, ARRAY['gestionnaire', 'admin'])
);

-- ============================================
-- ADD FK TO EXISTING TABLES
-- ============================================
-- Buildings
ALTER TABLE buildings
ADD COLUMN address_id UUID REFERENCES addresses(id) ON DELETE SET NULL;

CREATE INDEX idx_buildings_address_id ON buildings(address_id)
WHERE address_id IS NOT NULL;

-- Lots
ALTER TABLE lots
ADD COLUMN address_id UUID REFERENCES addresses(id) ON DELETE SET NULL;

CREATE INDEX idx_lots_address_id ON lots(address_id)
WHERE address_id IS NOT NULL;

-- Companies
ALTER TABLE companies
ADD COLUMN address_id UUID REFERENCES addresses(id) ON DELETE SET NULL;

CREATE INDEX idx_companies_address_id ON companies(address_id)
WHERE address_id IS NOT NULL;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE addresses IS 'Centralized address storage with Google Maps geocoding support';
COMMENT ON COLUMN addresses.street IS 'Street name and number (e.g., "Rue de la Paix 123")';
COMMENT ON COLUMN addresses.latitude IS 'GPS latitude from Google Places API (-90 to 90)';
COMMENT ON COLUMN addresses.longitude IS 'GPS longitude from Google Places API (-180 to 180)';
COMMENT ON COLUMN addresses.place_id IS 'Google Places unique identifier for caching and updates';
COMMENT ON COLUMN addresses.formatted_address IS 'Canonical formatted address from Google';
