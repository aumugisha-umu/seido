-- Migration: Add contract_id to interventions table
-- Description: Allows linking interventions directly to a contract (lease)
-- This enables tracking which interventions were created from a contract (état des lieux, révisions, etc.)

-- Step 1: Add contract_id column with foreign key to contracts table
ALTER TABLE public.interventions
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL;

-- Step 2: Create index for efficient queries by contract
-- Partial index since most interventions won't have a contract_id
CREATE INDEX IF NOT EXISTS idx_interventions_contract_id
ON public.interventions(contract_id) WHERE contract_id IS NOT NULL;

-- Step 3: Add column comment for documentation
COMMENT ON COLUMN public.interventions.contract_id IS
'Optional link to the contract that generated this intervention (état des lieux, révisions loyer/charges, etc.)';

-- Step 4: Update RLS policy to allow access based on contract
-- (The existing team_id policy already handles this, but we ensure contract_id doesn't break anything)

-- Note: No data migration needed - existing interventions will have NULL contract_id
-- New interventions created from contracts will have this field populated
