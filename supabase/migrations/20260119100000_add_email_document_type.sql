-- Migration: Add 'email' to intervention_document_type enum
-- Purpose: Allow email PDFs to be categorized as 'email' document type
-- Date: 2026-01-19

-- Add 'email' value to the intervention_document_type enum
ALTER TYPE intervention_document_type ADD VALUE IF NOT EXISTS 'email';

-- Note: PostgreSQL enum values are added at the end by default
-- The IF NOT EXISTS clause prevents errors if this migration is run multiple times
