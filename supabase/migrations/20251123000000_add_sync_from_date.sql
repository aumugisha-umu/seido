-- Migration: Add sync_from_date to team_email_connections

ALTER TABLE team_email_connections
ADD COLUMN sync_from_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days');

COMMENT ON COLUMN team_email_connections.sync_from_date IS 'Start date for email synchronization. Only emails received after this date will be synced.';
