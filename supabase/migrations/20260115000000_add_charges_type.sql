-- Migration: Add charges_type enum and column to contracts table
-- Date: 2026-01-15
-- Description: Allows distinguishing between fixed charges (forfaitaire) and
--              provisional charges with annual regularization (provision)

-- Step 1: Create the enum type
CREATE TYPE public.charges_type AS ENUM (
  'forfaitaire',  -- Fixed charges, no annual adjustment
  'provision'     -- Provisional amount, subject to annual regularization
);

-- Step 2: Add the column to contracts table with default 'forfaitaire'
ALTER TABLE public.contracts
ADD COLUMN charges_type public.charges_type NOT NULL DEFAULT 'forfaitaire';

-- Step 3: Add descriptive comment
COMMENT ON COLUMN public.contracts.charges_type IS
  'Type de charges: forfaitaire (montant fixe sans régularisation) ou provision (avance régularisée annuellement)';

-- Step 4: Create index for potential filtering
CREATE INDEX idx_contracts_charges_type ON public.contracts(charges_type);
