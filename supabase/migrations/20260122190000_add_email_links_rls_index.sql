-- Migration: Add covering index for email_links RLS policy lookups
-- Purpose: Speed up "Assigned users" and "Tenants" RLS policies on emails table
-- Date: 2026-01-22

-- The emails table has 6 RLS policies. Policies #5 and #6 need to look up
-- email_links to check if the email is linked to an intervention the user
-- can access. This covering index speeds up that lookup significantly.
--
-- Before: Sequential scan or index scan on email_id alone
-- After: Index-only scan on (email_id, entity_type)

CREATE INDEX IF NOT EXISTS idx_email_links_email_entity_type
    ON email_links(email_id, entity_type);

COMMENT ON INDEX idx_email_links_email_entity_type IS
    'Covering index for RLS policies: WHERE el.email_id = emails.id AND el.entity_type = intervention';
