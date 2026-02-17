-- Add expiry_date column to contract_documents table
-- Supports document validity tracking (e.g., insurance certificates expire yearly)
ALTER TABLE contract_documents
ADD COLUMN expiry_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN contract_documents.expiry_date IS 'Optional expiry date for documents with a validity period (e.g., attestation_assurance)';
