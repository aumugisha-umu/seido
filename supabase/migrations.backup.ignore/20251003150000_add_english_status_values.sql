-- Migration Part 1: Add English values to intervention_status ENUM
-- Date: 2025-10-03
-- Description: Adds new English status values to the ENUM type

-- Add new English values to the ENUM (one by one to handle duplicates)
DO $$
BEGIN
  -- pending
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending' AND enumtypid = 'intervention_status'::regtype) THEN
    ALTER TYPE intervention_status ADD VALUE 'pending';
  END IF;

  -- rejected
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = 'intervention_status'::regtype) THEN
    ALTER TYPE intervention_status ADD VALUE 'rejected';
  END IF;

  -- approved
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'approved' AND enumtypid = 'intervention_status'::regtype) THEN
    ALTER TYPE intervention_status ADD VALUE 'approved';
  END IF;

  -- quote_requested
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'quote_requested' AND enumtypid = 'intervention_status'::regtype) THEN
    ALTER TYPE intervention_status ADD VALUE 'quote_requested';
  END IF;

  -- scheduling
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'scheduling' AND enumtypid = 'intervention_status'::regtype) THEN
    ALTER TYPE intervention_status ADD VALUE 'scheduling';
  END IF;

  -- scheduled
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'scheduled' AND enumtypid = 'intervention_status'::regtype) THEN
    ALTER TYPE intervention_status ADD VALUE 'scheduled';
  END IF;

  -- in_progress
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'in_progress' AND enumtypid = 'intervention_status'::regtype) THEN
    ALTER TYPE intervention_status ADD VALUE 'in_progress';
  END IF;

  -- provider_completed
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'provider_completed' AND enumtypid = 'intervention_status'::regtype) THEN
    ALTER TYPE intervention_status ADD VALUE 'provider_completed';
  END IF;

  -- tenant_validated
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'tenant_validated' AND enumtypid = 'intervention_status'::regtype) THEN
    ALTER TYPE intervention_status ADD VALUE 'tenant_validated';
  END IF;

  -- completed
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'completed' AND enumtypid = 'intervention_status'::regtype) THEN
    ALTER TYPE intervention_status ADD VALUE 'completed';
  END IF;

  -- cancelled
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = 'intervention_status'::regtype) THEN
    ALTER TYPE intervention_status ADD VALUE 'cancelled';
  END IF;

  RAISE NOTICE '✅ English status values added to intervention_status ENUM';
END$$;
