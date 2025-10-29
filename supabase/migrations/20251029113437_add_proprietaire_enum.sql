-- Migration Part 1: Add Proprietaire Enum Values
-- Date: 2025-10-29
-- Purpose:
--   1. Add 'proprietaire' as a distinct user_role (not a provider_category)
--   2. Remove 'proprietaire' from provider_category enum
--   3. Simplify provider_category to only 'prestataire' and 'autre'

-- ============================================================================
-- STEP 1: Add 'proprietaire' to user_role enum
-- ============================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'proprietaire';

COMMENT ON TYPE user_role IS
'User roles in the system:
- admin: System administrator
- gestionnaire: Property manager
- locataire: Tenant
- prestataire: Service provider
- proprietaire: Property owner (can be assigned to interventions, has read-only access to owned properties)';

-- ============================================================================
-- STEP 2: Add 'proprietaire' to team_member_role enum
-- ============================================================================

ALTER TYPE team_member_role ADD VALUE IF NOT EXISTS 'proprietaire';

COMMENT ON TYPE team_member_role IS
'Team member roles:
- admin: Team administrator
- manager: Team manager (gestionnaire)
- member: Team member
- proprietaire: Property owner';

-- ============================================================================
-- STEP 3: Simplify provider_category enum
-- ============================================================================

-- Remove 'proprietaire', 'assurance', 'notaire', 'syndic'
-- Keep only 'prestataire' and 'autre'

-- Convert any non-standard categories to 'autre'
UPDATE users
SET provider_category = 'autre'::provider_category
WHERE provider_category NOT IN ('prestataire', 'autre');

UPDATE user_invitations
SET provider_category = 'autre'::provider_category
WHERE provider_category NOT IN ('prestataire', 'autre');

-- Create simplified enum
CREATE TYPE provider_category_new AS ENUM (
  'prestataire',   -- Service provider
  'autre'          -- Other
);

COMMENT ON TYPE provider_category_new IS
'Simplified provider categories:
- prestataire: Service provider
- autre: Other (assurance, notaire, syndic, etc.)';

-- Migrate users.provider_category column
ALTER TABLE users
  ALTER COLUMN provider_category TYPE provider_category_new
  USING provider_category::text::provider_category_new;

-- Migrate user_invitations.provider_category column
ALTER TABLE user_invitations
  ALTER COLUMN provider_category TYPE provider_category_new
  USING provider_category::text::provider_category_new;

-- Drop old enum and rename new one
DROP TYPE provider_category;
ALTER TYPE provider_category_new RENAME TO provider_category;
