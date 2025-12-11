-- ============================================================================
-- MIGRATION: Update contract_status Enum (Add 'a_venir', Remove 'brouillon')
-- ============================================================================
-- Handles partial migration state where column may already be renamed
-- ============================================================================

-- 0. Cleanup from any previous failed attempts
DROP TYPE IF EXISTS contract_status_new;

-- 1. Drop dependent indexes
DROP INDEX IF EXISTS idx_contracts_status;
DROP INDEX IF EXISTS idx_contracts_expiring;

-- 2. Handle column state (may already be renamed from previous attempt)
-- If status exists, rename it. If status_old exists, we're already past this step.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'contracts' AND column_name = 'status') THEN
    ALTER TABLE contracts RENAME COLUMN status TO status_old;
  END IF;
END $$;

-- 3. Create NEW enum type (different name to avoid conflict)
CREATE TYPE contract_status_new AS ENUM (
  'a_venir',
  'actif',
  'expire',
  'resilie',
  'renouvele'
);

-- 4. Add new column with the new type
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS status contract_status_new DEFAULT 'a_venir' NOT NULL;

-- 5. Migrate data from old column to new (brouillon -> a_venir)
UPDATE contracts SET status = 
  CASE 
    WHEN status_old::text = 'brouillon' THEN 'a_venir'::contract_status_new
    ELSE status_old::text::contract_status_new
  END
WHERE status_old IS NOT NULL;

-- 6. Drop the old column (this releases the old type)
ALTER TABLE contracts DROP COLUMN IF EXISTS status_old;

-- 7. Now we can drop the old enum type
DROP TYPE IF EXISTS contract_status;

-- 8. Rename the new type to the standard name
ALTER TYPE contract_status_new RENAME TO contract_status;

-- 9. Recreate indexes
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_expiring ON contracts(end_date, status)
  WHERE deleted_at IS NULL AND status = 'actif';

-- 10. Add comment
COMMENT ON TYPE contract_status IS 'Statut du cycle de vie du contrat';
