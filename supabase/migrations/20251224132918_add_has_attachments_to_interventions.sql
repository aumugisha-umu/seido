-- Add has_attachments column to interventions table
-- This flag indicates whether an intervention has associated documents

ALTER TABLE interventions
  ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for performance when filtering by has_attachments
CREATE INDEX IF NOT EXISTS idx_interventions_has_attachments 
  ON interventions(has_attachments) 
  WHERE has_attachments = true;

-- Function to update has_attachments flag based on intervention_documents count
CREATE OR REPLACE FUNCTION update_intervention_has_attachments()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the intervention's has_attachments flag
  UPDATE interventions
  SET has_attachments = EXISTS (
    SELECT 1 
    FROM intervention_documents 
    WHERE intervention_id = COALESCE(NEW.intervention_id, OLD.intervention_id)
  )
  WHERE id = COALESCE(NEW.intervention_id, OLD.intervention_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update has_attachments when documents are added
CREATE TRIGGER trigger_update_has_attachments_on_insert
  AFTER INSERT ON intervention_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_intervention_has_attachments();

-- Trigger to automatically update has_attachments when documents are deleted
CREATE TRIGGER trigger_update_has_attachments_on_delete
  AFTER DELETE ON intervention_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_intervention_has_attachments();

-- Backfill existing interventions: set has_attachments = true for interventions that have documents
UPDATE interventions
SET has_attachments = EXISTS (
  SELECT 1 
  FROM intervention_documents 
  WHERE intervention_documents.intervention_id = interventions.id
);

