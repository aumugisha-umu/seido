-- ============================================================================
-- Migration: Import Jobs Table
-- Description: Track bulk import operations for buildings, lots, contacts, contracts
-- ============================================================================

-- Create import_job_status enum
CREATE TYPE import_job_status AS ENUM (
  'pending',      -- Job created, waiting to start
  'validating',   -- Validating rows
  'importing',    -- Import in progress
  'completed',    -- Successfully completed
  'failed',       -- Failed with errors
  'cancelled'     -- Cancelled by user
);

-- Create import_entity_type enum
CREATE TYPE import_entity_type AS ENUM (
  'building',
  'lot',
  'contact',
  'contract',
  'mixed'  -- Multi-sheet import
);

-- Create import_jobs table
CREATE TABLE import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Job metadata
  entity_type import_entity_type NOT NULL,
  status import_job_status NOT NULL DEFAULT 'pending',
  filename VARCHAR(255) NOT NULL,

  -- Progress tracking
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,

  -- Results
  errors JSONB DEFAULT '[]'::jsonb,  -- [{row, sheet, field, message, value}]
  created_ids JSONB DEFAULT '{}'::jsonb,  -- {buildings: [], lots: [], contacts: [], contracts: []}
  updated_ids JSONB DEFAULT '{}'::jsonb,  -- For upsert tracking

  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,  -- {column_mapping, options, etc.}

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_import_jobs_team_id ON import_jobs(team_id);
CREATE INDEX idx_import_jobs_user_id ON import_jobs(user_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_jobs_created_at ON import_jobs(created_at DESC);
CREATE INDEX idx_import_jobs_entity_type ON import_jobs(entity_type);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_import_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_import_jobs_updated_at
  BEFORE UPDATE ON import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_import_jobs_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- Team members can view their team's import jobs
CREATE POLICY "import_jobs_select_team_member"
  ON import_jobs FOR SELECT
  USING (
    team_id IN (
      SELECT tm.team_id
      FROM team_members tm
      WHERE tm.user_id = get_current_user_id()
        AND tm.left_at IS NULL
    )
  );

-- Only gestionnaires and admins can create import jobs
CREATE POLICY "import_jobs_insert_gestionnaire"
  ON import_jobs FOR INSERT
  WITH CHECK (
    (is_gestionnaire() OR is_admin())
    AND team_id IN (
      SELECT tm.team_id
      FROM team_members tm
      WHERE tm.user_id = get_current_user_id()
        AND tm.left_at IS NULL
    )
  );

-- Users can only update their own import jobs
CREATE POLICY "import_jobs_update_own"
  ON import_jobs FOR UPDATE
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

-- Users can delete their own import jobs (for cleanup)
CREATE POLICY "import_jobs_delete_own"
  ON import_jobs FOR DELETE
  USING (user_id = get_current_user_id());

-- Admin can manage all import jobs in their teams
CREATE POLICY "import_jobs_admin_full_access"
  ON import_jobs FOR ALL
  USING (
    is_admin()
    AND team_id IN (
      SELECT tm.team_id
      FROM team_members tm
      WHERE tm.user_id = get_current_user_id()
        AND tm.left_at IS NULL
    )
  );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE import_jobs IS 'Tracks bulk import operations for buildings, lots, contacts, and contracts';
COMMENT ON COLUMN import_jobs.errors IS 'Array of validation/import errors: [{row, sheet, field, message, value}]';
COMMENT ON COLUMN import_jobs.created_ids IS 'Map of created entity IDs: {buildings: [uuid], lots: [uuid], ...}';
COMMENT ON COLUMN import_jobs.updated_ids IS 'Map of updated entity IDs for upsert operations';
COMMENT ON COLUMN import_jobs.metadata IS 'Additional job context: column mappings, import options, etc.';
