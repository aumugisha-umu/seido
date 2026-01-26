-- ============================================================================
-- Migration: Add RLS Policies for Assigned Users on Emails
-- Date: 2026-01-21
-- Description: Allow prestataires and locataires to view emails linked to their
--              interventions via the email_links table.
-- ============================================================================

-- ============================================================================
-- 1. Add RLS policy for assigned users to view emails via email_links
-- ============================================================================

-- Policy for users assigned to interventions (prestataires/gestionnaires)
-- This allows them to see emails linked to their interventions
CREATE POLICY "Assigned users can view emails linked to their interventions"
  ON emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM email_links el
      INNER JOIN intervention_assignments ia
        ON el.entity_id = ia.intervention_id
      WHERE el.email_id = emails.id
        AND el.entity_type = 'intervention'
        AND ia.user_id = auth.uid()
    )
  );

-- Policy for tenants (locataires) who requested the intervention
-- This allows them to see emails linked to interventions on their lots
-- Uses lot_contacts.user_id -> users.auth_user_id chain (role = 'locataire')
CREATE POLICY "Tenants can view emails linked to their intervention requests"
  ON emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM email_links el
      INNER JOIN interventions i
        ON el.entity_id = i.id
      INNER JOIN lots l
        ON i.lot_id = l.id
      INNER JOIN lot_contacts lc
        ON l.id = lc.lot_id
      INNER JOIN users u
        ON lc.user_id = u.id
      WHERE el.email_id = emails.id
        AND el.entity_type = 'intervention'
        AND u.auth_user_id = auth.uid()
        AND u.role = 'locataire'
    )
  );

-- ============================================================================
-- 2. Add RLS policy for assigned users to view email_links
-- ============================================================================

-- Policy for users assigned to interventions to view email links
CREATE POLICY "Assigned users can view email links for their interventions"
  ON email_links FOR SELECT
  USING (
    entity_type = 'intervention'
    AND is_assigned_to_intervention(entity_id)
  );

-- Policy for tenants to view email links for their intervention requests
-- Uses lot_contacts.user_id -> users.auth_user_id chain (role = 'locataire')
CREATE POLICY "Tenants can view email links for their intervention requests"
  ON email_links FOR SELECT
  USING (
    entity_type = 'intervention'
    AND EXISTS (
      SELECT 1
      FROM interventions i
      INNER JOIN lots l ON i.lot_id = l.id
      INNER JOIN lot_contacts lc ON l.id = lc.lot_id
      INNER JOIN users u ON lc.user_id = u.id
      WHERE i.id = email_links.entity_id
        AND u.auth_user_id = auth.uid()
        AND u.role = 'locataire'
    )
  );

-- ============================================================================
-- 3. Add RLS policy for assigned users to view email_attachments
-- ============================================================================

-- Policy for users assigned to interventions to view attachments
CREATE POLICY "Assigned users can view attachments of linked intervention emails"
  ON email_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM emails e
      INNER JOIN email_links el ON e.id = el.email_id
      INNER JOIN intervention_assignments ia ON el.entity_id = ia.intervention_id
      WHERE e.id = email_attachments.email_id
        AND el.entity_type = 'intervention'
        AND ia.user_id = auth.uid()
    )
  );

-- Policy for tenants to view attachments of their intervention emails
-- Uses lot_contacts.user_id -> users.auth_user_id chain (role = 'locataire')
CREATE POLICY "Tenants can view attachments of linked intervention emails"
  ON email_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM emails e
      INNER JOIN email_links el ON e.id = el.email_id
      INNER JOIN interventions i ON el.entity_id = i.id
      INNER JOIN lots l ON i.lot_id = l.id
      INNER JOIN lot_contacts lc ON l.id = lc.lot_id
      INNER JOIN users u ON lc.user_id = u.id
      WHERE e.id = email_attachments.email_id
        AND el.entity_type = 'intervention'
        AND u.auth_user_id = auth.uid()
        AND u.role = 'locataire'
    )
  );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Assigned users can view emails linked to their interventions"
  ON emails IS
  'Allows prestataires and gestionnaires assigned to an intervention to view emails linked to that intervention via email_links';

COMMENT ON POLICY "Tenants can view emails linked to their intervention requests"
  ON emails IS
  'Allows locataires who are tenants of the lot to view emails linked to interventions on their lot';

COMMENT ON POLICY "Assigned users can view email links for their interventions"
  ON email_links IS
  'Allows assigned users to see the email-to-intervention links for their interventions';

COMMENT ON POLICY "Tenants can view email links for their intervention requests"
  ON email_links IS
  'Allows tenants to see email-to-intervention links for interventions on their lot';
